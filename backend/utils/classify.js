
export function classifyComplaint(description = "") {
  const text = description.toLowerCase();

  if (
    text.includes("leak") ||
    text.includes("pipe") ||
    text.includes("burst")
  ) {
    return {
      category: "Water Leakage",
      priority: "High"
    };
  }

  if (
    text.includes("drain") ||
    text.includes("sewage") ||
    text.includes("blocked")
  ) {
    return {
      category: "Drainage Problem",
      priority: "High"
    };
  }

  if (
    text.includes("dirty") ||
    text.includes("contaminated") ||
    text.includes("quality")
  ) {
    return {
      category: "Water Quality",
      priority: "High"
    };
  }

  if (
    text.includes("no water") ||
    text.includes("water supply") ||
    text.includes("shortage")
  ) {
    return {
      category: "Water Supply",
      priority: "Medium"
    };
  }

  return {
    category: "General Complaint",
    priority: "Medium"
  };
}
