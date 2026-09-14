from pathlib import Path
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.colors import HexColor, white
from reportlab.lib.enums import TA_LEFT

root = Path(__file__).resolve().parents[1]
output = root / 'output/pdf/CampusShare-Tech-Stack.pdf'
output.parent.mkdir(parents=True, exist_ok=True)
styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name='TitleCS', fontName='Helvetica-Bold', fontSize=30, leading=35, textColor=HexColor('#0b1938'), spaceAfter=12))
styles.add(ParagraphStyle(name='IntroCS', fontSize=11, leading=17, textColor=HexColor('#536486'), spaceAfter=18))
styles.add(ParagraphStyle(name='SectionCS', fontName='Helvetica-Bold', fontSize=14, leading=20, textColor=HexColor('#065cf1'), spaceBefore=18, spaceAfter=9))
styles.add(ParagraphStyle(name='CellCS', fontSize=9, leading=13, textColor=HexColor('#0b1938')))
styles.add(ParagraphStyle(name='SmallCS', fontSize=9, leading=14, textColor=HexColor('#536486'), spaceAfter=8))
story = []
def p(text, style='SmallCS'): return Paragraph(text, styles[style])
story += [p('CAMPUSSHARE / ENGINEERING OVERVIEW','SectionCS'),p('The technology<br/>behind sharing.','TitleCS'),p('A campus borrowing platform for discovering items, requesting exchanges, messaging owners, confirming handovers and returns, and completing test-mode payments.','IntroCS')]
rows = [ ['Layer','Technology','Role in this project'],
['Frontend','React 19 + React Router 7','Reusable UI and client-side routing across marketplace, account, exchange and admin pages.'],
['Build tooling','Vite 7 + npm','Development server, production bundles and package lockfiles.'],
['Visual system','CSS + Tailwind CSS 4','Shared blue-and-white theme, responsive layouts, states and utility styling.'],
['Typography and icons','DM Sans / DM Serif Display; Lucide React','Locally bundled readable fonts and consistent interface icons.'],
['Motion and charts','Motion; Recharts','Entrance and layout motion, interactive feedback and dashboard charts. Native browser scrolling is used.'],
['Client networking','Axios','Browser requests to the Express API.'],
['Backend','Node.js + Express 5','HTTP API, validation, business logic, route protection and static frontend hosting.'],
['Database','MySQL 8 + mysql2','Persistent relational data, SQL access, schema setup and demo seed data.'],
['Authentication','bcrypt; JSON Web Tokens; cookies','Password hashing, token-based sessions and protected student/admin routes.'],
['Security middleware','Helmet, CORS, express-rate-limit','Security headers, allowed-origin controls and request throttling.'],
['Uploads','Multer + Cloudinary','Upload handling and optional configured cloud image storage.'],
['Payments','Razorpay hosted checkout + server verification','Test-mode orders and signature verification; animated demo fallback when test keys are absent.'],
['Testing and deployment','Node test runner; Docker / Compose','API integration tests, production build checks and container configuration.'] ]
data=[[p(c,'CellCS') for c in row] for row in rows]
table=Table(data,colWidths=[80,153,266],repeatRows=1,hAlign='LEFT')
table.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),HexColor('#e5f2ff')),('ROWBACKGROUNDS',(0,1),(-1,-1),[white,HexColor('#f5f8ff')]),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),10),('RIGHTPADDING',(0,0),(-1,-1),10),('TOPPADDING',(0,0),(-1,-1),9),('BOTTOMPADDING',(0,0),(-1,-1),9),('LINEBELOW',(0,0),(-1,0),1,HexColor('#b9d0f5'))]))
story += [table,p('How the parts connect','SectionCS'),p('React browser UI &rarr; Express API &rarr; MySQL database. The API separately contacts Razorpay for payment verification and Cloudinary for configured uploads. Provider secrets stay on the server.'),p('Repository map','SectionCS'),p('<b>client/</b> - active React application, styles and frontend assets.<br/><b>server/src/</b> - API routes, controllers, middleware and services.<br/><b>server/database/</b> - schema and development data setup.<br/><b>server/test/</b> - integration tests.<br/><b>public/404/</b> - preserved animated 404 experience.<br/><b>scripts/start-full.mjs</b> - unified local start.'),p('Local development','SectionCS'),p('Use a current Node.js release compatible with Vite 7 (Node 22.12+ recommended), npm and MySQL 8. Copy server/.env.example to server/.env and enter local values. Run npm ci, npm --prefix client ci, and npm --prefix server ci. Then run npm --prefix server run db:setup. Build with npm run build and start with npm start. Open http://localhost:3000. See README.md for separate frontend/API development.'),p('Status and important boundaries','SectionCS'),p('The production build and eight integration tests passed in the local environment. Desktop/mobile page-load checks covered 24 routes at each viewport. These checks do not replace production security, load or accessibility testing.'),p('<b>Payments are test-only:</b> this build rejects live Razorpay keys. Real-money release requires reviewed live-mode support, webhook reconciliation and production configuration. Demo accounts and catalogue images must be replaced before public launch.'),p('GSAP, Lenis and Radix packages are installed; package presence does not mean every page uses them. Lenis smooth scrolling is deliberately not enabled. The active app is React/Express/MySQL; older prototype files are not its runtime.'),p('Sources: client/package.json, server/package.json, active source files, README.md and DESIGN-HANDOFF.md. Package families above describe this repository, not a claim about the latest available releases.')]
def footer(canvas, doc):
    canvas.setStrokeColor(HexColor('#e1e8f4'));canvas.line(48,43,547,43)
    canvas.setFont('Helvetica',8);canvas.setFillColor(HexColor('#536486'))
    canvas.drawString(48,29,'CampusShare | Technology overview | September 2026')
    canvas.drawRightString(547,29,str(doc.page))
SimpleDocTemplate(str(output),pagesize=(595,842),rightMargin=48,leftMargin=48,topMargin=40,bottomMargin=60).build(story,onFirstPage=footer,onLaterPages=footer)
print(output)
