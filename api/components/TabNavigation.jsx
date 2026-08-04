import { useState } from "react";
import "./TabNavigation.css";
import teamLogo from "../assets/TeamAnveshakLogo.png";

export default function TabNavigation({ activeTab, setActiveTab }) {
  const [menuOpen, setMenuOpen] = useState(false);

  const tabs = [
    { id: "bills", label: "Bills" },
    { id: "pocs", label: "Company PoCs" },
    { id: "about", label: "About" },
  ];

  const handleTabClick = (tabId) => {
    setActiveTab(tabId);
    setMenuOpen(false);
  };

  return (
    <nav className="tab-navigation">
      <div className="nav-header">
        <h1 className="nav-logo">
          <img src={teamLogo} alt="Team Anveshak" className="nav-logo-img" />
          Anveshak DB
        </h1>

        <div className={`tabs-container ${menuOpen ? "open" : ""}`}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`tab-button ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => handleTabClick(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <button 
          className={`hamburger ${menuOpen ? "open" : ""}`}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>
    </nav>
  );
}
