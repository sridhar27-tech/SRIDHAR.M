const fs = require('fs');
const file = 'c:/Users/SRIDHAR.M/Prolync project/april project/NEW with backend/retail_billing_system.html';
let txt = fs.readFileSync(file, 'utf8');

// 1. Title -> inject html2pdf
txt = txt.replace(/<title>.*?<\/title>/, '<title>ShopBill Pro — Retail Billing System</title>\n  <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>');

// 2. body { ... } -> inject bg-animation css and body
txt = txt.replace(/body\s*\{\s*font-family:\s*var\(--font-body\);/, `/* ── BACKGROUND ANIMATION ── */
  .bg-animation { position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: -1; overflow: hidden; pointer-events: none; }
  .bg-orb { position: absolute; border-radius: 50%; filter: blur(100px); opacity: 0.5; animation: float 20s infinite ease-in-out alternate; }
  .orb-1 { width: 600px; height: 600px; background: rgba(245, 166, 35, 0.15); top: -100px; left: -100px; }
  .orb-2 { width: 700px; height: 700px; background: rgba(92, 141, 240, 0.12); bottom: -150px; right: -100px; animation-delay: -5s; animation-duration: 25s; }
  .orb-3 { width: 450px; height: 450px; background: rgba(62, 207, 142, 0.1); top: 40%; left: 30%; animation-delay: -10s; animation-duration: 18s; }
  @keyframes float { 0% { transform: translate(0,0) scale(1); } 50% { transform: translate(50px,30px) scale(1.1); } 100% { transform: translate(-30px,-50px) scale(0.9); } }
  body {
    font-family: var(--font-body);`);

// 3. main { flex: 1; ... } -> add z-index
txt = txt.replace(/main\s*\{\s*flex:\s*1[^}]+}/, 'main { flex: 1; padding: 28px 32px; max-width: 1400px; width: 100%; margin: 0 auto; z-index: 1; position: relative; }');

// 4. .page { ... } -> update animation
txt = txt.replace(/\.page\s*\{\s*display:\s*none[^}]+}/, '.page { display: none; opacity: 0; transform: translateY(20px) scale(0.98); }');

// 5. .page.active { ... } -> update active transition
txt = txt.replace(/\.page\.active\s*\{\s*display:\s*block[^}]*}/, '.page.active { display: block; animation: pageEnter 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }\n  @keyframes pageEnter { from { opacity: 0; transform: translateY(20px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }');

// 6. stats-grid { ... } -> update grid cols
txt = txt.replace(/\.stats-grid\s*\{[^}]+}/, '.stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 28px; }');

// 7. <body> -> inject bg divs
txt = txt.replace(/<body>/, `<body>\n<div class="bg-animation"><div class="bg-orb orb-1"></div><div class="bg-orb orb-2"></div><div class="bg-orb orb-3"></div></div>`);

// 8. renderDashboard -> update logical block
const dashboardRegex = /const lowStock \= products\.filter[^\}]+\.length;/;
txt = txt.replace(dashboardRegex, `const now = new Date(); const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()); const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1); const todayBills = bills.filter(b => new Date(b.date).toDateString() === now.toDateString()); const weeklyBills = bills.filter(b => new Date(b.date) >= startOfWeek); const monthlyBills = bills.filter(b => new Date(b.date) >= startOfMonth); const totalRevenue = bills.reduce((s,b) => s+b.total, 0); const todayRevenue = todayBills.reduce((s,b) => s+b.total, 0); const weeklyRevenue = weeklyBills.reduce((s,b) => s+b.total, 0); const monthlyRevenue = monthlyBills.reduce((s,b) => s+b.total, 0); const lowStock = products.filter(p => p.stock < 20).length;`);

const statsArrRegex = /const stats \= \[[\s\S]*?\];/;
txt = txt.replace(statsArrRegex, `const stats = [ { label:"Total Revenue", value: "₹"+totalRevenue.toFixed(0), sub:"All time", color:"var(--accent)" }, { label:"Today's Sales", value: "₹"+todayRevenue.toFixed(0), sub: todayBills.length+" bills today", color:"var(--green)" }, { label:"Weekly Sales", value: "₹"+weeklyRevenue.toFixed(0), sub: weeklyBills.length+" bills this week", color:"#a05cf0" }, { label:"Monthly Sales", value: "₹"+monthlyRevenue.toFixed(0), sub: monthlyBills.length+" bills this month", color:"#f05ca0" }, { label:"Total Bills", value: bills.length, sub:"Invoices generated", color:"var(--blue)" }, { label:"Low Stock Items", value: lowStock, sub: products.length+" total products", color: lowStock>0?"var(--red)":"var(--green)" } ];`);

// 9. PDF Save 
txt = txt.replace(/showInvoice\(bill\);\s*billingCart=\[\];/m, `showInvoice(bill);\n    const targetElem = document.getElementById("invoicePrint");\n    html2pdf().set({ margin: 10, filename: bill.invoiceNo + ".pdf", image: { type: "jpeg", quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: "mm", format: "a4", orientation: "portrait" } }).from(targetElem).save();\n    billingCart=[];`);

// 10. View button fix
txt = txt.replace(/DB\.bills\.find\(b\s*=>\s*b\.id\s*===\s*id\);/g, 'DB.bills.find(b=>b.id==id);');

fs.writeFileSync(file, txt);
console.log('Update applied');
