
import React, { useEffect, useState } from "react";
import axios from "axios";
import jsPDF from "jspdf";

import {
  LayoutDashboard,
  Droplets,
  ClipboardList,
  Users,
  CalendarDays,
  Bell,
  LogOut,
  Moon,
  Sun,
  MapPin,
  Plus,
  Trash2,
  Languages,
  Activity,
  Menu,
  X,
  Clock,
  AlertCircle
} from "lucide-react";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from "recharts";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

const api = axios.create({
  baseURL: API
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem("aquaalert_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

const emptyAuth = {
  name: "",
  email: "",
  password: ""
};

export default function App() {
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState("login");
  const [authForm, setAuthForm] = useState(emptyAuth);

  const [page, setPage] = useState("dashboard");
  const [dark, setDark] = useState(false);
  const [telugu, setTelugu] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [complaints, setComplaints] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [waterReports, setWaterReports] = useState([]);

  // NEW: Water supply state
  const [waterSupply, setWaterSupply] = useState([]);

  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    resolved: 0,
    workers: 0
  });

  const [complaintForm, setComplaintForm] = useState({
    title: "",
    description: "",
    latitude: "",
    longitude: "",
    address: ""
  });

  const [photo, setPhoto] = useState(null);

  const [workerForm, setWorkerForm] = useState({
    name: "",
    phone: "",
    area: "",
    role: "Field Worker"
  });

  const [scheduleForm, setScheduleForm] = useState({
    area: "",
    date: "",
    time: "",
    workerName: "",
    task: ""
  });

  const [alertForm, setAlertForm] = useState({
    title: "",
    message: ""
  });

  const [qualityForm, setQualityForm] = useState({
    area: "",
    ph: "7",
    turbidity: "1",
    notes: ""
  });

  // NEW: Water supply form
  const [supplyForm, setSupplyForm] = useState({
    area: "",
    date: "",
    startTime: "",
    endTime: "",
    status: "Available",
    notes: ""
  });

  const isAdmin = user?.role === "admin";

  // Language labels
  const labels = telugu
    ? {
        dashboard: "డ్యాష్‌బోర్డ్",
        complaints: "ఫిర్యాదులు",
        workers: "సిబ్బంది",
        schedules: "పని షెడ్యూల్స్",
        alerts: "హెచ్చరికలు",
        water: "నీటి నాణ్యత",
        supply: "నీటి సరఫరా",
        logout: "లాగ్అవుట్",
        total: "మొత్తం ఫిర్యాదులు",
        pending: "పెండింగ్",
        progress: "పని జరుగుతోంది",
        resolved: "పరిష్కరించబడింది"
      }
    : {
        dashboard: "Dashboard",
        complaints: "Complaints",
        workers: "Workers",
        schedules: "Work Schedules",
        alerts: "Alerts",
        water: "Water Quality",
        supply: "Water Supply",
        logout: "Logout",
        total: "Total Complaints",
        pending: "Pending",
        progress: "In Progress",
        resolved: "Resolved"
      };

  // =====================================
  // LOAD DASHBOARD DATA
  // =====================================

  async function loadDashboard() {
    const requests = [
      api.get("/api/complaints"),
      api.get("/api/stats"),
      api.get("/api/alerts"),
      api.get("/api/schedules"),
      api.get("/api/water-quality"),
      api.get("/api/water-supply")
    ];

    const results = await Promise.allSettled(requests);

    if (results[0].status === "fulfilled") {
      setComplaints(results[0].value.data);
    }

    if (results[1].status === "fulfilled") {
      setStats(results[1].value.data);
    }

    if (results[2].status === "fulfilled") {
      setAlerts(results[2].value.data);
    }

    if (results[3].status === "fulfilled") {
      setSchedules(results[3].value.data);
    }

    if (results[4].status === "fulfilled") {
      setWaterReports(results[4].value.data);
    }

    if (results[5].status === "fulfilled") {
      setWaterSupply(results[5].value.data);
    } else {
      console.error("Unable to load water supply:", results[5].reason);
    }

    if (isAdmin) {
      try {
        const response = await api.get("/api/workers");
        setWorkers(response.data);
      } catch (err) {
        console.error("Unable to load workers:", err);
      }
    }
  }

  // =====================================
  // CHECK EXISTING LOGIN
  // =====================================

  useEffect(() => {
    const token = localStorage.getItem("aquaalert_token");

    if (!token) return;

    api.get("/api/auth/me")
      .then(response => {
        setUser(response.data.user);
      })
      .catch(() => {
        localStorage.removeItem("aquaalert_token");
      });
  }, []);

  useEffect(() => {
    if (user) {
      loadDashboard().catch(err => {
        setError(
          err.response?.data?.message ||
          "Unable to load dashboard."
        );
      });
    }
  }, [user]);

  // =====================================
  // LOGIN AND REGISTER
  // =====================================

  async function handleAuth(event) {
    event.preventDefault();

    setError("");
    setNotice("");
    setLoading(true);

    try {
      const endpoint =
        authMode === "register"
          ? "/api/auth/register"
          : "/api/auth/login";

      const response = await axios.post(
        `${API}${endpoint}`,
        authForm
      );

      localStorage.setItem(
        "aquaalert_token",
        response.data.token
      );

      setUser(response.data.user);
      setAuthForm(emptyAuth);
      setNotice(response.data.message);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        (err.response
          ? `Request failed with status ${err.response.status}.`
          : "Cannot connect to backend. Check that it is running on port 5000.")
      );
    } finally {
      setLoading(false);
    }
  }

  // =====================================
  // LOGOUT
  // =====================================

  function logout() {
    localStorage.removeItem("aquaalert_token");

    setUser(null);
    setComplaints([]);
    setWorkers([]);
    setSchedules([]);
    setAlerts([]);
    setWaterReports([]);
    setWaterSupply([]);

    setPage("dashboard");
    setError("");
    setNotice("");
  }

  // =====================================
  // COMPLAINT MANAGEMENT
  // =====================================

  async function submitComplaint(event) {
    event.preventDefault();

    setError("");
    setNotice("");

    try {
      const formData = new FormData();

      Object.entries(complaintForm).forEach(([key, value]) => {
        formData.append(key, value);
      });

      if (photo) {
        formData.append("photo", photo);
      }

      const response = await api.post(
        "/api/complaints",
        formData
      );

      setNotice(response.data.message);

      setComplaintForm({
        title: "",
        description: "",
        latitude: "",
        longitude: "",
        address: ""
      });

      setPhoto(null);

      await loadDashboard();
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Complaint submission failed."
      );
    }
  }

  function getGPS() {
    if (!navigator.geolocation) {
      setError("GPS is not supported by this browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      position => {
        setComplaintForm(current => ({
          ...current,
          latitude: position.coords.latitude.toString(),
          longitude: position.coords.longitude.toString()
        }));

        setNotice("GPS location added.");
      },
      () => {
        setError("Location permission denied or unavailable.");
      }
    );
  }

  async function updateComplaint(id, status) {
    try {
      await api.patch(
        `/api/complaints/${id}/status`,
        { status }
      );

      setNotice("Complaint status updated.");
      await loadDashboard();
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Unable to update complaint."
      );
    }
  }

  // =====================================
  // WORKER MANAGEMENT
  // =====================================

  async function addWorker(event) {
    event.preventDefault();

    try {
      await api.post("/api/workers", workerForm);

      setWorkerForm({
        name: "",
        phone: "",
        area: "",
        role: "Field Worker"
      });

      setNotice("Worker added successfully.");

      await loadDashboard();
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Unable to add worker."
      );
    }
  }

  async function deleteWorker(id) {
    try {
      await api.delete(`/api/workers/${id}`);

      setNotice("Worker deleted successfully.");

      await loadDashboard();
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Unable to delete worker."
      );
    }
  }

  // =====================================
  // WORK SCHEDULES
  // =====================================

  async function addSchedule(event) {
    event.preventDefault();

    try {
      await api.post("/api/schedules", scheduleForm);

      setScheduleForm({
        area: "",
        date: "",
        time: "",
        workerName: "",
        task: ""
      });

      setNotice("Work schedule added.");

      await loadDashboard();
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Unable to add schedule."
      );
    }
  }

  // =====================================
  // ALERT MANAGEMENT
  // =====================================

  async function addAlert(event) {
    event.preventDefault();

    try {
      await api.post("/api/alerts", alertForm);

      setAlertForm({
        title: "",
        message: ""
      });

      setNotice("Alert published successfully.");

      await loadDashboard();
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Unable to publish alert."
      );
    }
  }

  // =====================================
  // WATER QUALITY MANAGEMENT
  // =====================================

  async function addWaterReport(event) {
    event.preventDefault();

    try {
      await api.post("/api/water-quality", qualityForm);

      setQualityForm({
        area: "",
        ph: "7",
        turbidity: "1",
        notes: ""
      });

      setNotice("Water quality report added.");

      await loadDashboard();
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Unable to add water quality report."
      );
    }
  }

  // =====================================
  // NEW: WATER SUPPLY MANAGEMENT
  // =====================================

  async function addWaterSupply(event) {
    event.preventDefault();

    setError("");
    setNotice("");

    if (supplyForm.startTime >= supplyForm.endTime) {
      setError("Ending time must be later than starting time.");
      return;
    }

    try {
      const response = await api.post(
        "/api/water-supply",
        supplyForm
      );

      setSupplyForm({
        area: "",
        date: "",
        startTime: "",
        endTime: "",
        status: "Available",
        notes: ""
      });

      setNotice(
        response.data.message ||
        "Water supply schedule added successfully."
      );

      await loadDashboard();
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Unable to add water supply schedule."
      );
    }
  }

  async function deleteWaterSupply(id) {
    setError("");
    setNotice("");

    try {
      const response = await api.delete(
        `/api/water-supply/${id}`
      );

      setNotice(
        response.data.message ||
        "Water supply schedule deleted."
      );

      await loadDashboard();
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Unable to delete water supply schedule."
      );
    }
  }

  // =====================================
  // PDF REPORT
  // =====================================

  function exportPDF() {
    const pdf = new jsPDF();

    pdf.setFontSize(18);
    pdf.text("AquaAlert Complaint Report", 14, 20);

    pdf.setFontSize(10);

    pdf.text(
      `Generated: ${new Date().toLocaleString()}`,
      14,
      29
    );

    let y = 42;

    complaints.forEach((item, index) => {
      if (y > 270) {
        pdf.addPage();
        y = 20;
      }

      const lines = pdf.splitTextToSize(
        `${index + 1}. ${item.title} | ${item.category} | ${item.status}`,
        180
      );

      pdf.text(lines, 14, y);

      y += lines.length * 7 + 3;
    });

    pdf.save("AquaAlert-Report.pdf");
  }

  // =====================================
  // NAVIGATION
  // =====================================

  const navItems = [
    {
      id: "dashboard",
      label: labels.dashboard,
      icon: LayoutDashboard
    },
    {
      id: "complaints",
      label: labels.complaints,
      icon: ClipboardList
    },

    // Available to both admin and citizens
    {
      id: "supply",
      label: labels.supply,
      icon: Droplets
    },

    ...(isAdmin
      ? [
          {
            id: "workers",
            label: labels.workers,
            icon: Users
          },
          {
            id: "schedules",
            label: labels.schedules,
            icon: CalendarDays
          },
          {
            id: "water",
            label: labels.water,
            icon: Activity
          }
        ]
      : []),

    {
      id: "alerts",
      label: labels.alerts,
      icon: Bell
    }
  ];

  // =====================================
  // LOGIN PAGE
  // =====================================

  if (!user) {
    return (
      <main className="auth-page">
        <section className="auth-hero">
          <div className="brand-mark">
            <Droplets size={30} />
          </div>

          <h1>AquaAlert</h1>

          <p>
            Smart Water Supply & Complaint Management System
          </p>

          <div className="hero-points">
            <span>✓ Report water issues</span>
            <span>✓ Track complaint status</span>
            <span>✓ Check water supply schedules</span>
            <span>✓ Improve community water services</span>
          </div>
        </section>

        <form className="auth-card" onSubmit={handleAuth}>
          <h2>
            {authMode === "register"
              ? "Create Account"
              : "Welcome Back"}
          </h2>

          <p>
            {authMode === "register"
              ? "Register as a citizen"
              : "Sign in to AquaAlert"}
          </p>

          {authMode === "register" && (
            <label>
              Full Name

              <input
                required
                value={authForm.name}
                onChange={e =>
                  setAuthForm({
                    ...authForm,
                    name: e.target.value
                  })
                }
                placeholder="Enter your name"
              />
            </label>
          )}

          <label>
            Email

            <input
              required
              type="email"
              value={authForm.email}
              onChange={e =>
                setAuthForm({
                  ...authForm,
                  email: e.target.value
                })
              }
              placeholder="Enter your email"
            />
          </label>

          <label>
            Password

            <input
              required
              minLength={8}
              type="password"
              value={authForm.password}
              onChange={e =>
                setAuthForm({
                  ...authForm,
                  password: e.target.value
                })
              }
              placeholder="Minimum 8 characters"
            />
          </label>

          {error && (
            <p className="message error">{error}</p>
          )}

          {notice && (
            <p className="message success">{notice}</p>
          )}

          <button
            className="primary-button"
            disabled={loading}
          >
            {loading
              ? "Please wait..."
              : authMode === "register"
                ? "Register"
                : "Login"}
          </button>

          <p className="switch-auth">
            {authMode === "register"
              ? "Already have an account?"
              : "New to AquaAlert?"}

            <button
              type="button"
              className="text-button"
              onClick={() => {
                setAuthMode(
                  authMode === "register"
                    ? "login"
                    : "register"
                );

                setError("");
                setNotice("");
              }}
            >
              {authMode === "register"
                ? "Login"
                : "Create account"}
            </button>
          </p>

          <div className="admin-hint">
            Admin demo login: admin@aquaalert.local / Admin@12345
          </div>
        </form>
      </main>
    );
  }

  // =====================================
  // MAIN APPLICATION
  // =====================================

  return (
    <div className={`app-shell ${dark ? "dark" : ""}`}>

      {/* SIDEBAR */}

      <aside className={`sidebar ${mobileMenu ? "show" : ""}`}>
        <div className="sidebar-brand">
          <Droplets size={27} />

          <strong>AquaAlert</strong>

          <button
            className="close-menu"
            onClick={() => setMobileMenu(false)}
          >
            <X />
          </button>
        </div>

        <div className="user-mini">
          <div className="avatar">
            {user.name?.charAt(0).toUpperCase()}
          </div>

          <div>
            <strong>{user.name}</strong>
            <small>{user.role}</small>
          </div>
        </div>

        <nav>
          {navItems.map(item => {
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                className={
                  page === item.id
                    ? "nav-item active"
                    : "nav-item"
                }
                onClick={() => {
                  setPage(item.id);
                  setMobileMenu(false);
                  setError("");
                  setNotice("");
                }}
              >
                <Icon size={19} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <button
          className="logout-button"
          onClick={logout}
        >
          <LogOut size={18} />
          {labels.logout}
        </button>
      </aside>

      {/* MAIN AREA */}

      <main className="main-area">

        {/* TOP BAR */}

        <header className="topbar">
          <button
            className="menu-button"
            onClick={() => setMobileMenu(true)}
          >
            <Menu />
          </button>

          <div>
            <h2>
              {navItems.find(item => item.id === page)?.label ||
                "AquaAlert"}
            </h2>

            <p>Welcome, {user.name}</p>
          </div>

          <div className="top-actions">
            <button
              className="icon-button"
              onClick={() => setTelugu(!telugu)}
              title="Language"
            >
              <Languages size={19} />
              {telugu ? "తెలుగు" : "EN"}
            </button>

            <button
              className="icon-button"
              onClick={() => setDark(!dark)}
              title="Theme"
            >
              {dark
                ? <Sun size={19} />
                : <Moon size={19} />}
            </button>

            <button
              className="icon-button"
              onClick={exportPDF}
              title="Export PDF"
            >
              PDF
            </button>
          </div>
        </header>

        {/* PAGE CONTENT */}

        <section className="content-area">

          {error && (
            <div className="message error">
              {error}
            </div>
          )}

          {notice && (
            <div className="message success">
              {notice}
            </div>
          )}

          {/* =====================================
              DASHBOARD
          ===================================== */}

          {page === "dashboard" && (
            <>
              <div className="welcome-banner">
                <div>
                  <span className="eyebrow">
                    WATER MANAGEMENT OVERVIEW
                  </span>

                  <h1>
                    Smarter Water Services, Stronger Communities
                  </h1>

                  <p>
                    Monitor complaints and improve local water services.
                  </p>
                </div>

                <Droplets size={75} />
              </div>

              <div className="stats-grid">
                <StatCard
                  title={labels.total}
                  value={stats.total}
                  icon={<ClipboardList />}
                />

                <StatCard
                  title={labels.pending}
                  value={stats.pending}
                  icon={<Activity />}
                />

                <StatCard
                  title={labels.progress}
                  value={stats.inProgress}
                  icon={<CalendarDays />}
                />

                <StatCard
                  title={labels.resolved}
                  value={stats.resolved}
                  icon={<Droplets />}
                />

                {isAdmin && (
                  <StatCard
                    title="Workers"
                    value={stats.workers}
                    icon={<Users />}
                  />
                )}
              </div>

              <div className="panel">
                <div className="panel-heading">
                  <div>
                    <h3>Complaint Overview</h3>
                    <p>Current complaint status</p>
                  </div>
                </div>

                <div className="chart-wrap">
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart
                      data={[
                        {
                          name: "Pending",
                          count: stats.pending
                        },
                        {
                          name: "In Progress",
                          count: stats.inProgress
                        },
                        {
                          name: "Resolved",
                          count: stats.resolved
                        }
                      ]}
                    >
                      <CartesianGrid strokeDasharray="3 3" />

                      <XAxis dataKey="name" />

                      <YAxis allowDecimals={false} />

                      <Tooltip />

                      <Bar
                        dataKey="count"
                        fill="#0e9aa7"
                        radius={[7, 7, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="panel">
                <h3>Recent Complaints</h3>

                <ComplaintTable
                  complaints={complaints.slice(0, 5)}
                  isAdmin={isAdmin}
                  onUpdate={updateComplaint}
                />
              </div>

              {/* NEW: Recent Water Supply */}

              <div className="panel">
                <div className="panel-heading">
                  <div>
                    <h3>Upcoming Water Supply</h3>
                    <p>Latest community water supply schedules</p>
                  </div>
                </div>

                {waterSupply.length === 0 ? (
                  <p className="muted">
                    No water supply schedules available.
                  </p>
                ) : (
                  waterSupply.slice(0, 3).map(item => (
                    <div className="list-row" key={item.id}>
                      <div>
                        <strong>
                          <Droplets size={16} /> {item.area}
                        </strong>

                        <small>
                          {item.date} · {item.startTime} – {item.endTime}
                        </small>

                        <span className="status-pill">
                          {item.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}

                <button
                  className="secondary-button"
                  onClick={() => setPage("supply")}
                >
                  View All Water Supply
                </button>
              </div>
            </>
          )}

          {/* =====================================
              COMPLAINTS
          ===================================== */}

          {page === "complaints" && (
            <>
              <div className="two-column">
                <div className="panel">
                  <h3>Submit a Complaint</h3>

                  <form
                    className="stack-form"
                    onSubmit={submitComplaint}
                  >
                    <label>
                      Complaint Title

                      <input
                        required
                        value={complaintForm.title}
                        onChange={e =>
                          setComplaintForm({
                            ...complaintForm,
                            title: e.target.value
                          })
                        }
                        placeholder="Example: Water leakage near street"
                      />
                    </label>

                    <label>
                      Description

                      <textarea
                        required
                        rows="4"
                        value={complaintForm.description}
                        onChange={e =>
                          setComplaintForm({
                            ...complaintForm,
                            description: e.target.value
                          })
                        }
                        placeholder="Describe the water issue..."
                      />
                    </label>

                    <label>
                      Photo (JPG, PNG or WEBP)

                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={e =>
                          setPhoto(e.target.files?.[0] || null)
                        }
                      />
                    </label>

                    <div className="location-box">
                      <MapPin size={18} />

                      <span>
                        {complaintForm.latitude
                          ? `${complaintForm.latitude}, ${complaintForm.longitude}`
                          : "GPS location not added"}
                      </span>

                      <button
                        type="button"
                        className="secondary-button"
                        onClick={getGPS}
                      >
                        Get GPS
                      </button>
                    </div>

                    <label>
                      Address / Area

                      <input
                        value={complaintForm.address}
                        onChange={e =>
                          setComplaintForm({
                            ...complaintForm,
                            address: e.target.value
                          })
                        }
                        placeholder="Enter your area"
                      />
                    </label>

                    <button className="primary-button">
                      <Plus size={18} />
                      Submit Complaint
                    </button>
                  </form>
                </div>

                <div className="panel">
                  <h3>Complaint Guidelines</h3>

                  <ul className="guidelines">
                    <li>Provide a clear title and description.</li>
                    <li>Add a photo when it helps explain the issue.</li>
                    <li>Enable GPS to share the location.</li>
                    <li>Track progress from your complaint list.</li>
                    <li>Do not include private personal information in photos.</li>
                  </ul>

                  <div className="info-card">
                    <Droplets size={30} />

                    <h4>AI-assisted Classification</h4>

                    <p>
                      Complaints are automatically grouped by keywords
                      to help staff prioritize them.
                    </p>
                  </div>
                </div>
              </div>

              <div className="panel">
                <h3>My Complaints</h3>

                <ComplaintTable
                  complaints={complaints}
                  isAdmin={isAdmin}
                  onUpdate={updateComplaint}
                />
              </div>
            </>
          )}

          {/* =====================================
              NEW: WATER SUPPLY
          ===================================== */}

          {page === "supply" && (
            <>
              <div className="welcome-banner">
                <div>
                  <span className="eyebrow">
                    COMMUNITY WATER SERVICES
                  </span>

                  <h1>Water Supply Management</h1>

                  <p>
                    Check area-wise water supply dates, timings and updates.
                  </p>
                </div>

                <Droplets size={75} />
              </div>

              {isAdmin && (
                <div className="panel">
                  <h3>
                    <Plus size={19} /> Add Water Supply Schedule
                  </h3>

                  <form
                    className="stack-form"
                    onSubmit={addWaterSupply}
                  >
                    <label>
                      Area / Village

                      <input
                        required
                        value={supplyForm.area}
                        onChange={e =>
                          setSupplyForm({
                            ...supplyForm,
                            area: e.target.value
                          })
                        }
                        placeholder="Enter area or village name"
                      />
                    </label>

                    <label>
                      Supply Date

                      <input
                        required
                        type="date"
                        value={supplyForm.date}
                        onChange={e =>
                          setSupplyForm({
                            ...supplyForm,
                            date: e.target.value
                          })
                        }
                      />
                    </label>

                    <div className="two-column">
                      <label>
                        Starting Time

                        <input
                          required
                          type="time"
                          value={supplyForm.startTime}
                          onChange={e =>
                            setSupplyForm({
                              ...supplyForm,
                              startTime: e.target.value
                            })
                          }
                        />
                      </label>

                      <label>
                        Ending Time

                        <input
                          required
                          type="time"
                          value={supplyForm.endTime}
                          onChange={e =>
                            setSupplyForm({
                              ...supplyForm,
                              endTime: e.target.value
                            })
                          }
                        />
                      </label>
                    </div>

                    <label>
                      Supply Status

                      <select
                        value={supplyForm.status}
                        onChange={e =>
                          setSupplyForm({
                            ...supplyForm,
                            status: e.target.value
                          })
                        }
                      >
                        <option value="Available">
                          Available
                        </option>

                        <option value="Delayed">
                          Delayed
                        </option>

                        <option value="Interrupted">
                          Interrupted
                        </option>
                      </select>
                    </label>

                    <label>
                      Additional Notes

                      <textarea
                        rows="3"
                        value={supplyForm.notes}
                        onChange={e =>
                          setSupplyForm({
                            ...supplyForm,
                            notes: e.target.value
                          })
                        }
                        placeholder="Enter additional information"
                      />
                    </label>

                    <button className="primary-button">
                      <Plus size={18} />
                      Add Water Supply
                    </button>
                  </form>
                </div>
              )}

              {/* Water supply list for admin and citizens */}

              <div className="panel">
                <div className="panel-heading">
                  <div>
                    <h3>Water Supply Timetable</h3>

                    <p>
                      {isAdmin
                        ? "Manage the community water supply schedule."
                        : "Check the latest water supply schedule for your area."}
                    </p>
                  </div>

                  <Droplets size={25} />
                </div>

                {waterSupply.length === 0 ? (
                  <div className="empty-state">
                    <Droplets size={40} />

                    <h3>No Water Supply Schedules</h3>

                    <p>
                      Water supply schedules will appear here
                      when they are published by the admin.
                    </p>
                  </div>
                ) : (
                  <div className="supply-grid">
                    {waterSupply.map(item => (
                      <div
                        className="supply-card"
                        key={item.id}
                      >
                        <div className="supply-card-header">
                          <div className="supply-icon">
                            <Droplets size={24} />
                          </div>

                          <span
                            className={`supply-status ${item.status?.toLowerCase()}`}
                          >
                            {item.status}
                          </span>
                        </div>

                        <h3>{item.area}</h3>

                        <div className="supply-detail">
                          <CalendarDays size={17} />

                          <span>
                            {item.date}
                          </span>
                        </div>

                        <div className="supply-detail">
                          <Clock size={17} />

                          <span>
                            {item.startTime} – {item.endTime}
                          </span>
                        </div>

                        {item.notes && (
                          <div className="supply-notes">
                            <AlertCircle size={16} />
                            <span>{item.notes}</span>
                          </div>
                        )}

                        {isAdmin && (
                          <button
                            className="danger-button"
                            onClick={() =>
                              deleteWaterSupply(item.id)
                            }
                          >
                            <Trash2 size={17} />
                            Delete Schedule
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* =====================================
              WORKERS
          ===================================== */}

          {page === "workers" && isAdmin && (
            <div className="two-column">
              <div className="panel">
                <h3>Add Worker</h3>

                <form
                  className="stack-form"
                  onSubmit={addWorker}
                >
                  <label>
                    Name

                    <input
                      required
                      value={workerForm.name}
                      onChange={e =>
                        setWorkerForm({
                          ...workerForm,
                          name: e.target.value
                        })
                      }
                    />
                  </label>

                  <label>
                    Phone

                    <input
                      required
                      value={workerForm.phone}
                      onChange={e =>
                        setWorkerForm({
                          ...workerForm,
                          phone: e.target.value
                        })
                      }
                    />
                  </label>

                  <label>
                    Area

                    <input
                      value={workerForm.area}
                      onChange={e =>
                        setWorkerForm({
                          ...workerForm,
                          area: e.target.value
                        })
                      }
                    />
                  </label>

                  <label>
                    Role

                    <input
                      value={workerForm.role}
                      onChange={e =>
                        setWorkerForm({
                          ...workerForm,
                          role: e.target.value
                        })
                      }
                    />
                  </label>

                  <button className="primary-button">
                    <Plus size={18} />
                    Add Worker
                  </button>
                </form>
              </div>

              <div className="panel">
                <h3>Worker Directory</h3>

                {workers.map(worker => (
                  <div
                    className="list-row"
                    key={worker.id}
                  >
                    <div>
                      <strong>{worker.name}</strong>

                      <small>
                        {worker.phone} · {worker.area}
                      </small>
                    </div>

                    <button
                      className="danger-button"
                      onClick={() => deleteWorker(worker.id)}
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                ))}

                {workers.length === 0 && (
                  <p className="muted">
                    No workers added yet.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* =====================================
              WORK SCHEDULES
          ===================================== */}

          {page === "schedules" && isAdmin && (
            <div className="two-column">
              <div className="panel">
                <h3>Create Work Schedule</h3>

                <form
                  className="stack-form"
                  onSubmit={addSchedule}
                >
                  <label>
                    Area

                    <input
                      required
                      value={scheduleForm.area}
                      onChange={e =>
                        setScheduleForm({
                          ...scheduleForm,
                          area: e.target.value
                        })
                      }
                    />
                  </label>

                  <label>
                    Date

                    <input
                      required
                      type="date"
                      value={scheduleForm.date}
                      onChange={e =>
                        setScheduleForm({
                          ...scheduleForm,
                          date: e.target.value
                        })
                      }
                    />
                  </label>

                  <label>
                    Time

                    <input
                      required
                      type="time"
                      value={scheduleForm.time}
                      onChange={e =>
                        setScheduleForm({
                          ...scheduleForm,
                          time: e.target.value
                        })
                      }
                    />
                  </label>

                  <label>
                    Worker Name

                    <input
                      value={scheduleForm.workerName}
                      onChange={e =>
                        setScheduleForm({
                          ...scheduleForm,
                          workerName: e.target.value
                        })
                      }
                    />
                  </label>

                  <label>
                    Task

                    <input
                      required
                      value={scheduleForm.task}
                      onChange={e =>
                        setScheduleForm({
                          ...scheduleForm,
                          task: e.target.value
                        })
                      }
                    />
                  </label>

                  <button className="primary-button">
                    Save Schedule
                  </button>
                </form>
              </div>

              <div className="panel">
                <h3>Work Schedules</h3>

                {schedules.map(item => (
                  <div
                    className="list-row"
                    key={item.id}
                  >
                    <div>
                      <strong>{item.task}</strong>

                      <small>
                        {item.area} · {item.date} · {item.time} · {item.workerName}
                      </small>
                    </div>
                  </div>
                ))}

                {schedules.length === 0 && (
                  <p className="muted">
                    No schedules available.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* =====================================
              ALERTS
          ===================================== */}

          {page === "alerts" && (
            <div className="two-column">
              {isAdmin && (
                <div className="panel">
                  <h3>Publish Alert</h3>

                  <form
                    className="stack-form"
                    onSubmit={addAlert}
                  >
                    <label>
                      Title

                      <input
                        required
                        value={alertForm.title}
                        onChange={e =>
                          setAlertForm({
                            ...alertForm,
                            title: e.target.value
                          })
                        }
                      />
                    </label>

                    <label>
                      Message

                      <textarea
                        required
                        rows="4"
                        value={alertForm.message}
                        onChange={e =>
                          setAlertForm({
                            ...alertForm,
                            message: e.target.value
                          })
                        }
                      />
                    </label>

                    <button className="primary-button">
                      Publish Alert
                    </button>
                  </form>
                </div>
              )}

              <div className="panel">
                <h3>Community Alerts</h3>

                {alerts.map(alert => (
                  <div
                    className="alert-card"
                    key={alert.id}
                  >
                    <Bell size={19} />

                    <div>
                      <strong>{alert.title}</strong>

                      <p>{alert.message}</p>

                      <small>
                        {new Date(alert.createdAt).toLocaleString()}
                      </small>
                    </div>
                  </div>
                ))}

                {alerts.length === 0 && (
                  <p className="muted">
                    No alerts published.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* =====================================
              WATER QUALITY
          ===================================== */}

          {page === "water" && isAdmin && (
            <div className="two-column">
              <div className="panel">
                <h3>Add Water Quality Report</h3>

                <form
                  className="stack-form"
                  onSubmit={addWaterReport}
                >
                  <label>
                    Area

                    <input
                      required
                      value={qualityForm.area}
                      onChange={e =>
                        setQualityForm({
                          ...qualityForm,
                          area: e.target.value
                        })
                      }
                    />
                  </label>

                  <label>
                    pH Value

                    <input
                      required
                      type="number"
                      min="0"
                      max="14"
                      step="0.1"
                      value={qualityForm.ph}
                      onChange={e =>
                        setQualityForm({
                          ...qualityForm,
                          ph: e.target.value
                        })
                      }
                    />
                  </label>

                  <label>
                    Turbidity (NTU)

                    <input
                      required
                      type="number"
                      min="0"
                      step="0.1"
                      value={qualityForm.turbidity}
                      onChange={e =>
                        setQualityForm({
                          ...qualityForm,
                          turbidity: e.target.value
                        })
                      }
                    />
                  </label>

                  <label>
                    Notes

                    <input
                      value={qualityForm.notes}
                      onChange={e =>
                        setQualityForm({
                          ...qualityForm,
                          notes: e.target.value
                        })
                      }
                    />
                  </label>

                  <button className="primary-button">
                    Save Report
                  </button>
                </form>
              </div>

              <div className="panel">
                <h3>Water Quality Reports</h3>

                {waterReports.map(report => (
                  <div
                    className="list-row"
                    key={report.id}
                  >
                    <div>
                      <strong>{report.area}</strong>

                      <small>
                        pH: {report.ph} · Turbidity: {report.turbidity} NTU
                      </small>

                      <small>{report.notes}</small>
                    </div>

                    <span className="status-pill">
                      {report.ph >= 6.5 && report.ph <= 8.5
                        ? "pH in common reference range"
                        : "Needs review"}
                    </span>
                  </div>
                ))}

                {waterReports.length === 0 && (
                  <p className="muted">
                    No water reports yet.
                  </p>
                )}

                <p className="muted">
                  These measurements are informational and do not
                  certify water as safe to drink.
                </p>
              </div>
            </div>
          )}

        </section>
      </main>
    </div>
  );
}

// =====================================
// STAT CARD COMPONENT
// =====================================

function StatCard({ title, value, icon }) {
  return (
    <div className="stat-card">
      <div>
        <span>{title}</span>
        <strong>{value}</strong>
      </div>

      <div className="stat-icon">
        {icon}
      </div>
    </div>
  );
}

// =====================================
// COMPLAINT TABLE COMPONENT
// =====================================

function ComplaintTable({
  complaints,
  isAdmin,
  onUpdate
}) {
  if (!complaints.length) {
    return (
      <p className="muted">
        No complaints available yet.
      </p>
    );
  }

  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Title</th>
            <th>Category</th>
            <th>Priority</th>
            <th>Status</th>
            <th>Location</th>

            {isAdmin && <th>Update</th>}
          </tr>
        </thead>

        <tbody>
          {complaints.map(item => (
            <tr key={item.id}>
              <td>
                <strong>{item.title}</strong>

                <small>
                  {new Date(item.createdAt).toLocaleDateString()}
                </small>

                {item.photo && (
                  <a
                    href={`${API}${item.photo}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View photo
                  </a>
                )}
              </td>

              <td>{item.category}</td>

              <td>
                <span
                  className={`priority ${(item.priority || "normal").toLowerCase()}`}
                >
                  {item.priority || "Normal"}
                </span>
              </td>

              <td>
                <span className="status-pill">
                  {item.status}
                </span>
              </td>

              <td>
                {item.latitude && item.longitude ? (
                  <a
                    href={`https://www.google.com/maps?q=${item.latitude},${item.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Map
                  </a>
                ) : (
                  item.address || "—"
                )}
              </td>

              {isAdmin && (
                <td>
                  <select
                    value={item.status}
                    onChange={e =>
                      onUpdate(item.id, e.target.value)
                    }
                  >
                    <option>Pending</option>
                    <option>In Progress</option>
                    <option>Resolved</option>
                    <option>Rejected</option>
                  </select>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
