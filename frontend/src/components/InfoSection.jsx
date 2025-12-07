import React from "react";
import "./InfoSection.css";

const InfoSection = () => {
  return (
    <div className="info-section">
      <h1>
        Smart expense for <br /> Smarter sharing
      </h1>
      <p>
        Track expenses, split bills, and manage budgets with ease. <br />
        Never worry about who owes what again.
      </p>
      <ul>
        <li>Split expenses automatically</li>
        <li>Track group and personal spending</li>
        <li>Settle debts with one click</li>
      </ul>
      <div className="cta-box">
        🌟 <strong>Join 10,000+ users</strong>
        <br />
        <span>Who trust FairMate for expense management</span>
      </div>
    </div>
  );
};

export default InfoSection;