"use client";

import Link from "next/link";
import type { ReactNode } from "react";

interface SidebarLinkProps {
  href: string;
  className?: string;
  children: ReactNode;
}

export default function SidebarLink({ href, className, children }: SidebarLinkProps) {
  function handleClick() {
    if (window.innerWidth < 768) {
      const sidebar = document.getElementById("left-sidebar");
      const overlay = document.getElementById("sidebar-overlay");
      if (!sidebar || !overlay) return;

      sidebar.classList.remove("active");
      overlay.classList.remove("active");
      document.body.style.overflow = "";
    }
  }

  return (
    <Link href={href} className={className} onClick={handleClick}>
      {children}
    </Link>
  );
}
