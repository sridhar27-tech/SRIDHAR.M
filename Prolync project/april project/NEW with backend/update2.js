const fs = require('fs');
const file = 'c:/Users/SRIDHAR.M/Prolync project/april project/NEW with backend/retail_billing_system.html';
let txt = fs.readFileSync(file, 'utf8');

// 1. Remove background animation orbs div
txt = txt.replace(/<div class="bg-animation">[\s\S]*?<\/div>/, '');

// 2. Remove old css background orbs
txt = txt.replace(/\/\* ── BACKGROUND ANIMATION ── \*\/[\s\S]*?body\s*\{/, `/* ── FULL LIVE BACKGROUND ── */
    body {
      background: linear-gradient(135deg, #0d0f14, #1a1625, #0a1128, #161a22);
      background-size: 400% 400%;
      animation: gradientFlow 15s ease infinite;`);

txt = txt.replace(/background:\s*var\(--bg\);\s*color:\s*var\(--text\);\s*min-height:\s*100vh;/, `color: var(--text);
      min-height: 100vh;
    }

    @keyframes gradientFlow {
      0% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }`);

// 3. Add Dashboard report buttons
txt = txt.replace(/<div class="page-header">\s*<div>\s*<h2>Dashboard.*?<\/div>\s*<button.*?new bill.*?<\/button>\s*<\/div>/i, `<div class="page-header">
      <div><h2>Dashboard</h2><p>Overview of your store's performance</p></div>
      <div style="display:flex; gap:10px;">
        <button class="btn btn-ghost" onclick="generateSalesReport('weekly')">📥 Weekly Report</button>
        <button class="btn btn-ghost" onclick="generateSalesReport('monthly')">📥 Monthly Report</button>
        <button class="btn btn-primary" onclick="switchPage('billing')">+ New Bill</button>
      </div>
    </div>`);

// 4. Add generateSalesReport JS function right before loadData(); at the bottom
const functionCode = `
    async function generateSalesReport(type) {
      const now = new Date();
      let filteredBills = [];
      let title = "";
      
      if (type === 'weekly') {
        const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
        filteredBills = DB.bills.filter(b => new Date(b.date) >= startOfWeek);
        title = "Weekly Sales Report";
      } else if (type === 'monthly') {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        filteredBills = DB.bills.filter(b => new Date(b.date) >= startOfMonth);
        title = "Monthly Sales Report";
      }

      const totalRevenue = filteredBills.reduce((s,b) => s+b.total, 0);

      const reportHTML = \`
        <div style="font-family:'DM Sans',sans-serif; background:white; color:#111; padding:32px;">
          <h2 style="font-family:'Syne',sans-serif; color:#f5a623; border-bottom:2px solid #f5a623; padding-bottom:10px;">\${title}</h2>
          <p style="font-size:0.9rem; color:#666; margin-bottom:20px;">Generated on: \${now.toLocaleDateString('en-IN')}</p>
          
          <div style="display:flex; justify-content:space-between; background:#f9f9f9; padding:16px; border-radius:8px; margin-bottom:20px;">
            <div><strong>Total Bills:</strong> <br/>\${filteredBills.length}</div>
            <div style="text-align:right;"><strong>Total Revenue:</strong> <br/><span style="color:#f5a623; font-size:1.2rem; font-weight:700;">₹\${totalRevenue.toFixed(2)}</span></div>
          </div>
          
          <table style="width:100%; border-collapse:collapse; font-size:0.85rem;">
            <thead>
              <tr style="background:#f5f5f5; text-align:left; color:#888;">
                <th style="padding:10px;">Invoice No</th>
                <th style="padding:10px;">Date</th>
                <th style="padding:10px;">Customer</th>
                <th style="padding:10px; text-align:right;">Total</th>
              </tr>
            </thead>
            <tbody>
              \${filteredBills.length === 0 ? '<tr><td colspan="4" style="text-align:center; padding:20px;">No sales found for this period.</td></tr>' : ''}
              \${filteredBills.map(b => \`
                <tr style="border-bottom:1px solid #eee;">
                  <td style="padding:10px; font-family:monospace;">\${b.invoiceNo}</td>
                  <td style="padding:10px;">\${new Date(b.date).toLocaleDateString('en-IN')}</td>
                  <td style="padding:10px;">\${b.customerName}</td>
                  <td style="padding:10px; text-align:right; font-weight:bold; color:#f5a623;">₹\${b.total.toFixed(2)}</td>
                </tr>
              \`).join('')}
            </tbody>
          </table>
        </div>
      \`;

      const tempDiv = document.createElement('div');
      tempDiv.id = 'reportTempContainer';
      tempDiv.style.position = 'absolute';
      tempDiv.style.top = '-9999px';
      tempDiv.style.width = '800px';
      tempDiv.innerHTML = reportHTML;
      document.body.appendChild(tempDiv);

      toast('Generating report, please wait...');
      
      try {
        await html2pdf().set({
          margin: 10,
          filename: \`\${title.replace(/ /g, '_')}_\${now.getTime()}.pdf\`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2 },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        }).from(tempDiv).save();
        toast(\`\${title} downloaded successfully!\`);
      } catch (err) {
        console.error(err);
        toast('Failed to generate PDF', 'error');
      } finally {
        document.body.removeChild(tempDiv);
      }
    }

    // ═══════════ INIT ═══════════
`;

txt = txt.replace(/\/\/\s*═══════════\s*INIT\s*═══════════/i, functionCode);

fs.writeFileSync(file, txt);
console.log('Update2 applied');
