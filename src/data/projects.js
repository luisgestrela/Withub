export const categories = [
  { id: "science", label: "Science", color: "#0B5FFF" },
  { id: "technology", label: "Technology", color: "#6425F0" },
  { id: "engineering", label: "Engineering", color: "#166F45" },
  { id: "arts", label: "Arts", color: "#B5401F" },
  { id: "mathematics", label: "Mathematics", color: "#8A5A0A" },
];

export const categoryColor = (id) => categories.find((category) => category.id === id)?.color || "#57606A";
