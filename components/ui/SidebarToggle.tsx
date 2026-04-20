"use client";

interface SidebarToggleProps {
  icon: "menu" | "close";
  className?: string;
}

export default function SidebarToggle({ icon, className = "" }: SidebarToggleProps) {
  function toggleSidebar() {
    const sidebar = document.getElementById("left-sidebar");
    const overlay = document.getElementById("sidebar-overlay");
    if (!sidebar || !overlay) return;

    sidebar.classList.toggle("active");
    overlay.classList.toggle("active");

    if (sidebar.classList.contains("active")) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  }

  return (
    <button onClick={toggleSidebar} className={className}>
      <span className="material-symbols-outlined">{icon}</span>
    </button>
  );
}
