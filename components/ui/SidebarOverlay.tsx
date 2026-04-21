"use client";

export default function SidebarOverlay() {
  function handleClose() {
    const sidebar = document.getElementById("left-sidebar");
    const overlay = document.getElementById("sidebar-overlay");
    if (!sidebar || !overlay) return;

    sidebar.classList.remove("active");
    overlay.classList.remove("active");
    document.body.style.overflow = "";
  }

  return (
    <div
      id="sidebar-overlay"
      className="fixed inset-0 bg-black/60 backdrop-blur-xs z-55"
      onClick={handleClose}
    />
  );
}
