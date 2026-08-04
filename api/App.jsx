import { useState } from "react";
import TabNavigation from "./components/TabNavigation";
import BillsTab from "./components/BillsTab";
import "./App.css";

function App() {
  const [activeTab, setActiveTab] = useState("bills");

  return (
    <div className="app">
      <TabNavigation activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="main-content">
        {activeTab === "bills" && <BillsTab />}
        
        {activeTab === "pocs" && (
          <div className="placeholder-tab">
            <h2>Company PoCs</h2>
            <p>Company Points of Contact section - Coming soon</p>
          </div>
        )}
        
        {activeTab === "about" && (
          <div className="placeholder-tab">
            <h2>About</h2>
            <p>About Anveshak - Coming soon</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;