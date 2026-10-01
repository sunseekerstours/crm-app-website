import os
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

def set_cell_background(cell, fill_hex):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=120, bottom=120, left=180, right=180):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = parse_xml(f'<w:tcMar {nsdecls("w")}><w:top w:w="{top}" w:type="dxa"/><w:bottom w:w="{bottom}" w:type="dxa"/><w:left w:w="{left}" w:type="dxa"/><w:right w:w="{right}" w:type="dxa"/></w:tcMar>')
    tcPr.append(tcMar)

def add_callout(doc, text_lines, border_color="0284C7", bg_color="F0F9FF"):
    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl.autofit = False
    tbl.columns[0].width = Inches(6.5)
    
    cell = tbl.cell(0, 0)
    set_cell_background(cell, bg_color)
    set_cell_margins(cell, top=140, bottom=140, left=200, right=200)
    
    tcPr = cell._tc.get_or_add_tcPr()
    borders = parse_xml(
        f'<w:tcBorders {nsdecls("w")}>'
        f'<w:top w:val="none"/>'
        f'<w:left w:val="single" w:sz="36" w:space="0" w:color="{border_color}"/>'
        f'<w:bottom w:val="none"/>'
        f'<w:right w:val="none"/>'
        f'</w:tcBorders>'
    )
    tcPr.append(borders)
    
    p = cell.paragraphs[0]
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after = Pt(2)
    p.paragraph_format.line_spacing = 1.15
    for i, line in enumerate(text_lines):
        if i > 0:
            p = cell.add_paragraph()
            p.paragraph_format.space_before = Pt(2)
            p.paragraph_format.space_after = Pt(2)
            p.paragraph_format.line_spacing = 1.15
        run = p.add_run(line)
        run.font.size = Pt(10)
        run.font.name = 'Segoe UI'
        run.font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)
    
    # spacing after table
    sp = doc.add_paragraph()
    sp.paragraph_format.space_before = Pt(0)
    sp.paragraph_format.space_after = Pt(4)

def format_telegram_bubble(doc, title, lines):
    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl.autofit = False
    tbl.columns[0].width = Inches(6.5)
    
    cell = tbl.cell(0, 0)
    set_cell_background(cell, "F8FAFC")
    set_cell_margins(cell, top=160, bottom=160, left=220, right=220)
    
    tcPr = cell._tc.get_or_add_tcPr()
    borders = parse_xml(
        f'<w:tcBorders {nsdecls("w")}>'
        f'<w:top w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>'
        f'<w:left w:val="single" w:sz="24" w:space="0" w:color="0284C7"/>'
        f'<w:bottom w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>'
        f'<w:right w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>'
        f'</w:tcBorders>'
    )
    tcPr.append(borders)
    
    p = cell.paragraphs[0]
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(4)
    r_hdr = p.add_run(f"📱 TELEGRAM LIVE NOTIFICATION PREVIEW: {title}")
    r_hdr.font.bold = True
    r_hdr.font.size = Pt(10.5)
    r_hdr.font.name = 'Segoe UI'
    r_hdr.font.color.rgb = RGBColor(0x02, 0x84, 0xC7)
    
    for line in lines:
        p2 = cell.add_paragraph()
        p2.paragraph_format.space_before = Pt(1)
        p2.paragraph_format.space_after = Pt(1)
        p2.paragraph_format.line_spacing = 1.15
        run = p2.add_run(line)
        run.font.name = 'Consolas'
        run.font.size = Pt(9.5)
        run.font.color.rgb = RGBColor(0x1E, 0x29, 0x3B)
        if any(mark in line for mark in ['🚨', '🎉', '💰', '⏱️', '⚠️', '🎯', '✅', 'Sunseekers']):
            run.font.bold = True

    doc.add_paragraph().paragraph_format.space_after = Pt(6)

def style_table(tbl, col_widths, headers, data):
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl.autofit = False
    
    # Header row
    hdr_row = tbl.rows[0]
    hdr_row.height = Inches(0.35)
    for idx, heading in enumerate(headers):
        cell = hdr_row.cells[idx]
        cell.width = Inches(col_widths[idx])
        set_cell_background(cell, "0F172A")
        set_cell_margins(cell, top=100, bottom=100, left=140, right=140)
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT
        p.paragraph_format.space_before = Pt(2)
        p.paragraph_format.space_after = Pt(2)
        r = p.add_run(heading)
        r.font.bold = True
        r.font.size = Pt(9.5)
        r.font.name = 'Segoe UI'
        r.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
        
    for r_idx, row_data in enumerate(data):
        row = tbl.add_row()
        row.height = Inches(0.3)
        bg = "FFFFFF" if r_idx % 2 == 0 else "F8FAFC"
        for c_idx, val in enumerate(row_data):
            cell = row.cells[c_idx]
            cell.width = Inches(col_widths[c_idx])
            set_cell_background(cell, bg)
            set_cell_margins(cell, top=80, bottom=80, left=140, right=140)
            p = cell.paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.LEFT
            p.paragraph_format.space_before = Pt(2)
            p.paragraph_format.space_after = Pt(2)
            p.paragraph_format.line_spacing = 1.15
            r = p.add_run(val)
            r.font.size = Pt(9)
            r.font.name = 'Segoe UI'
            r.font.color.rgb = RGBColor(0x33, 0x41, 0x55)
            if c_idx == 0:
                r.font.bold = True

    doc_p = tbl._element.getparent()
    # add space after table
    sp = doc_p.add_paragraph() if hasattr(doc_p, 'add_paragraph') else None

def generate_manual():
    doc = docx.Document()
    
    # Page setup - 1 inch margins
    sections = doc.sections
    for s in sections:
        s.top_margin = Inches(1.0)
        s.bottom_margin = Inches(1.0)
        s.left_margin = Inches(1.0)
        s.right_margin = Inches(1.0)

    # Styles
    navy = RGBColor(0x0F, 0x17, 0x2A)
    blue = RGBColor(0x02, 0x84, 0xC7)
    gold = RGBColor(0xD9, 0x77, 0x06)
    dark_gray = RGBColor(0x33, 0x41, 0x55)

    # Document Header / Title
    title_p = doc.add_paragraph()
    title_p.paragraph_format.space_before = Pt(12)
    title_p.paragraph_format.space_after = Pt(4)
    title_r = title_p.add_run("☀️ SUNSEEKERS TRAVEL PLATFORM & CRM")
    title_r.font.size = Pt(24)
    title_r.font.bold = True
    title_r.font.name = 'Segoe UI'
    title_r.font.color.rgb = navy

    sub_p = doc.add_paragraph()
    sub_p.paragraph_format.space_before = Pt(0)
    sub_p.paragraph_format.space_after = Pt(18)
    sub_r = sub_p.add_run("Complete User Training Manual & Automation Guide | Operations, Sales & Fleet Management")
    sub_r.font.size = Pt(12)
    sub_r.font.name = 'Segoe UI'
    sub_r.font.color.rgb = blue

    # Metadata Block
    add_callout(doc, [
        "📘 Document Version: 2.4 (Enterprise Edition)",
        "🏢 Organization: Sunseekers Tours Limited",
        "🎯 Target Audience: Sales Agents, Operations Managers, Fleet Coordinators, Financial Officers, and System Administrators",
        "🌐 Applications Covered: Staff CRM (Port 3001), Executive Admin (Port 3003), Customer Web Portal (Port 3002)",
        "⚡ Automated Real-Time Channels: Telegram Bot Alerts, In-App Notifications, Jetpack CRM Synchronization"
    ], border_color="0284C7", bg_color="F0F9FF")

    # -------------------------------------------------------------------------
    # PART 1: SYSTEM OVERVIEW & ARCHITECTURE
    # -------------------------------------------------------------------------
    h1 = doc.add_heading(level=1)
    r = h1.add_run("1. System Overview & Core User Roles")
    r.font.color.rgb = navy
    r.font.name = 'Segoe UI'

    p = doc.add_paragraph(
        "The Sunseekers Travel Platform is a unified digital ecosystem engineered specifically for modern tour operators, "
        "travel management companies, and corporate fleet services. It bridges customer acquisition, inquiry handling, "
        "multi-day itinerary bookings, vehicle and driver logistics, and automated financial accounting into a synchronized workflow."
    )
    p.paragraph_format.line_spacing = 1.15

    # Roles Table
    roles_headers = ["Role Title", "Access Scope", "Primary Responsibilities"]
    roles_widths = [1.8, 1.8, 2.9]
    roles_data = [
        ["SUPER_ADMIN / ADMIN", "Full platform privileges across CRM, Admin, Financials, Fleet, and Automations.", "System configuration, user management, site settings, Telegram routing, database exports, and overarching audit oversight."],
        ["SALES_AGENT", "CRM Leads, Customer Pipeline, Deals, Quotes, and Activity Timelines.", "Lead outreach within SLA, qualifying prospects, building tour quotes, closing deals, and recording customer requests."],
        ["OPERATIONS_MANAGER", "Bookings, Calendar Schedule, Vehicle Dispatch, Driver Assignments, and Fleet Rates.", "Allocating cars and drivers to tours, monitoring vehicle statuses, tracking 4,000+ bookings, and ensuring tour delivery."],
        ["ACCOUNTANT / FINANCE", "Invoices, Payments, Receipts, Pricing, and Exporting Financial Logs.", "Issuing VAT/standard invoices, logging MoMo/Card/Wire payments, issuing official receipts, and reviewing overdue aging."],
        ["DRIVER / FIELD AGENT", "Mobile Driver Portal, Assigned Trips, Customer Pickup Logs.", "Viewing daily assigned trips, inspecting vehicle assignments, and acknowledging customer pickups."]
    ]
    tbl_roles = doc.add_table(rows=1, cols=3)
    style_table(tbl_roles, roles_widths, roles_headers, roles_data)

    # -------------------------------------------------------------------------
    # PART 2: END-TO-END USER GUIDE
    # -------------------------------------------------------------------------
    h1 = doc.add_heading(level=1)
    r = h1.add_run("2. Step-by-Step Module User Manual")
    r.font.color.rgb = navy

    # Section 2.1
    h2 = doc.add_heading(level=2)
    r = h2.add_run("2.1 Customer & Company Management")
    r.font.color.rgb = blue

    doc.add_paragraph(
        "Customers represent individual travelers or corporate liaisons. Every interaction (quotes, emails, deals, payments) "
        "is tied directly to a single customer profile, giving your team a 360-degree timeline."
    )
    doc.add_paragraph("Key Actions for Staff:", style='List Bullet')
    doc.add_paragraph("Creating a Customer: Navigate to Customers > 'Add Customer'. Enter first name, last name, email, phone (with country code), WhatsApp, and company affiliation.", style='List Bullet 2')
    doc.add_paragraph("Customer Tags: Assign tags such as 'VIP', 'Repeat Traveler', 'Corporate', or 'Fleet Client'. Tagging a client with 'fleet' automatically presets default dispatch preferences.", style='List Bullet 2')
    doc.add_paragraph("Activity Timeline: Open any customer detail to review every logged call, note, quote accepted, payment made, and automated reminder issued.", style='List Bullet 2')

    # Section 2.2
    h2 = doc.add_heading(level=2)
    r = h2.add_run("2.2 Leads Intake, Auto-Assignment & Pipeline")
    r.font.color.rgb = blue

    doc.add_paragraph(
        "Leads enter the system through website inquiries, WhatsApp forms, Jetpack CRM imports, or direct manual phone entry. "
        "The CRM uses automated round-robin load-balancing to distribute inquiries immediately to the least busy sales rep."
    )
    doc.add_paragraph("Lead Stages & Workflow:", style='List Bullet')
    doc.add_paragraph("1. NEW: Fresh inquiry awaiting first touch. Automatically generates a High-Priority Follow-Up Task due in 2 hours.", style='List Bullet 2')
    doc.add_paragraph("2. CONTACTED: Agent has called or emailed the traveler. Log notes immediately in the CRM timeline.", style='List Bullet 2')
    doc.add_paragraph("3. QUALIFIED: Traveler has confirmed dates, group size, and budget. Moving a lead to QUALIFIED automatically spawns an Opportunity (Deal) in the pipeline.", style='List Bullet 2')
    doc.add_paragraph("4. PROPOSAL SENT: An official customized quote has been sent to the traveler.", style='List Bullet 2')
    doc.add_paragraph("5. WON / LOST: Converted into a confirmed tour or archived with a loss reason (e.g. Budget, Competitor).", style='List Bullet 2')

    # Section 2.3
    h2 = doc.add_heading(level=2)
    r = h2.add_run("2.3 Quotes, Pricing & Official Proposals")
    r.font.color.rgb = blue
    doc.add_paragraph(
        "Staff can produce branded, itemized quotations within 30 seconds. Quotes automatically compute tour package line items, "
        "vehicle hire rates, guide fees, and hotel accommodations with standard tax calculations."
    )
    doc.add_paragraph("How to Issue a Quote:", style='List Bullet')
    doc.add_paragraph("Navigate to Quotes > 'Create Quote' or generate directly from an open Deal.", style='List Bullet 2')
    doc.add_paragraph("Select the Customer, Tour package, Validity Date (e.g., 14 days), and Currency (USD, GHS, EUR, GBP).", style='List Bullet 2')
    doc.add_paragraph("System generates a standardized reference (e.g. QTE-2026-48192).", style='List Bullet 2')
    doc.add_paragraph("Click 'Document Preview / Print' to generate an official PDF complete with Sunseekers branding, payment terms, and direct bank transfer instructions.", style='List Bullet 2')

    # Section 2.4
    h2 = doc.add_heading(level=2)
    r = h2.add_run("2.4 Invoicing & Automated Billing")
    r.font.color.rgb = blue
    doc.add_paragraph(
        "Invoicing is seamlessly linked to deals and tour bookings. When a sales rep moves a deal to WON, the platform automatically "
        "generates an official SST invoice (INV-YYYY-XXXXX) with itemized package costs and a default 7-day payment window."
    )

    # Section 2.5
    h2 = doc.add_heading(level=2)
    r = h2.add_run("2.5 Payment Recording & Official Receipts")
    r.font.color.rgb = blue
    doc.add_paragraph(
        "When a client pays via Mobile Money (MTN/Telecel), Bank Wire Transfer, Credit Card, or Cash, finance records the transaction under Payments:"
    )
    doc.add_paragraph("1. Select the relevant Invoice: The system auto-populates the customer, amount due, and currency.", style='List Bullet')
    doc.add_paragraph("2. Enter Payment Details: Amount paid, payment method, transaction/reference code.", style='List Bullet')
    doc.add_paragraph("3. Automatic Receipt Generation: The platform immediately creates an official receipt (e.g., REC-2026-92814).", style='List Bullet')
    doc.add_paragraph("4. Automatic Booking Confirmation: If the payment clears the invoice balance in full, the linked tour booking status changes from PENDING to CONFIRMED without manual intervention.", style='List Bullet')

    # Section 2.6
    h2 = doc.add_heading(level=2)
    r = h2.add_run("2.6 Fleet Management (Vehicles, Daily Rates & Drivers)")
    r.font.color.rgb = blue
    doc.add_paragraph(
        "The Fleet module coordinates all transportation assets for Sunseekers Tours and corporate private rentals."
    )
    doc.add_paragraph("Managing Vehicles:", style='List Bullet')
    doc.add_paragraph("Adding a Vehicle: Registration Number (e.g., GE 4819-24), Make & Model (e.g., Toyota Land Cruiser Prado), Passenger Capacity, Daily Rental Rate, and Current Operational Status (Available, In Service, Maintenance).", style='List Bullet 2')
    doc.add_paragraph("In-Place Editing: Click any vehicle card or table row to edit rates, update registration, or change status instantly.", style='List Bullet 2')
    doc.add_paragraph("Managing Drivers:", style='List Bullet')
    doc.add_paragraph("Add Driver: Full Name, Phone Number, Driver License Number, License Expiration Date, and Default Assigned Vehicle.", style='List Bullet 2')
    doc.add_paragraph("Status Toggles: Keep track of which drivers are Available, on Active Tour, or Off-Duty.", style='List Bullet 2')
    doc.add_paragraph("Asset Deletion: Managers can safely delete decommissioned vehicles or former drivers directly with confirmation security.", style='List Bullet 2')

    # -------------------------------------------------------------------------
    # PART 3: AUTOMATIONS ENGINE & TELEGRAM ALERT ROUTING
    # -------------------------------------------------------------------------
    h1 = doc.add_heading(level=1)
    r = h1.add_run("3. The 13 Sales & Operations Automations")
    r.font.color.rgb = navy

    doc.add_paragraph(
        "The platform includes 13 enterprise automation rules designed to eliminate manual data entry, enforce fast customer follow-up, "
        "and alert the entire company instantly on Telegram whenever business milestones occur."
    )

    auto_headers = ["No.", "Automation Name", "Event Trigger", "Automated Action Taken", "Telegram Alert?"]
    auto_widths = [0.4, 1.8, 1.8, 1.9, 0.6]
    auto_data = [
        ["1", "Auto Lead Assignment", "New lead arrives (Web/WhatsApp/API)", "Assigns lead to least busy active sales rep using round-robin.", "Yes"],
        ["2", "Immediate Follow-Up Task", "New lead created", "Creates a high-priority task for assigned rep with 2-hour SLA.", "Included"],
        ["3", "Stale Lead Reminder", "Lead inactive for 7 days", "Notifies sales rep in-app to re-engage or archive the prospect.", "In-App"],
        ["4", "Lead to Opportunity", "Lead moved to 'QUALIFIED'", "Automatically creates a new Deal in pipeline with calculated value.", "Yes"],
        ["5", "Deal Stagnation Watchdog", "Deal in same stage > 14 days", "Flags deal as stagnant on executive dashboard & notifies rep.", "In-App"],
        ["6", "Quote Follow-Up Reminder", "Quote in 'SENT' status > 3 days", "Creates task for rep to call client and review itinerary proposal.", "In-App"],
        ["7", "Deal Won to Invoice", "Deal moved to 'WON'", "Instantly creates official SST Invoice (INV-...) and accepts quote.", "Yes"],
        ["8", "Auto-Receipt Generation", "Payment logged in system", "Generates official receipt (REC-...) and updates invoice balances.", "Yes"],
        ["9", "Auto Booking Confirm", "Invoice paid in full", "Changes linked tour booking status from PENDING to CONFIRMED.", "Yes"],
        ["10", "Post-Sale Care Task", "Full payment received", "Creates 48-hr task: 'Send travel documents & welcome package'.", "Included"],
        ["11", "Duplicate Detection", "Customer/lead submitted", "Scans phone & email to prevent duplicate client accounts.", "Yes"],
        ["12", "Inactivity SLA Escalation", "Lead inactive > 48 hours", "Escalates directly to Telegram channel so management intervenes.", "Yes"],
        ["13", "Overdue Invoice Alert", "Invoice past due date + 1 day", "Alerts finance & management on Telegram with balance and debtor.", "Yes"]
    ]
    tbl_auto = doc.add_table(rows=1, cols=5)
    style_table(tbl_auto, auto_widths, auto_headers, auto_data)

    # -------------------------------------------------------------------------
    # PART 4: EXACT TELEGRAM MESSAGES & EXPLANATIONS
    # -------------------------------------------------------------------------
    h1 = doc.add_heading(level=1)
    r = h1.add_run("4. Telegram Notifications Guide: When Someone Sends, What Arrives")
    r.font.color.rgb = navy

    doc.add_paragraph(
        "The Telegram bot operates as a 24/7 digital dispatcher for your staff. Whenever an action occurs on the website, "
        "admin panel, or CRM, a beautifully formatted alert is pushed instantly into your Telegram staff channel. "
        "Below are the exact message layouts that appear on team members' phones, what triggers them, and what action is required."
    )

    # Message 1: New Lead
    h2 = doc.add_heading(level=2)
    r = h2.add_run("4.1 New Customer Tour Inquiry (Website / Form / WhatsApp)")
    r.font.color.rgb = blue
    doc.add_paragraph("Trigger: A visitor fills out an inquiry form on the website or a staff member inputs a new lead.", style='List Bullet')
    doc.add_paragraph("Destination: Operations & Sales Telegram Channel.", style='List Bullet')
    doc.add_paragraph("Action Required by Rep: Call or message the traveler within the 2-hour SLA window.", style='List Bullet')

    format_telegram_bubble(doc, "New Sales Lead Intake", [
        "🚨 NEW SALES LEAD",
        "━━━━━━━━━━━━━━━━━━━━━━",
        "👤 Customer: Dr. Kwame Mensah",
        "📞 Phone: +233 24 123 4567",
        "✉️ Email: kwame.mensah@gmail.com",
        "🎒 Interested Tour: December in Ghana - 12 Days Heritage Tour",
        "📍 Destination: Cape Coast & Ashanti Region",
        "🌐 Source: Website Booking Form",
        "💼 Assigned To: Sarah Quaye",
        "━━━━━━━━━━━━━━━━━━━━━━",
        "👉 Open CRM Leads Board (http://.../leads)"
    ])

    # Message 2: Existing Customer Re-Inquiry
    h2 = doc.add_heading(level=2)
    r = h2.add_run("4.2 Existing Customer Re-Inquiry (Duplicate Detection)")
    r.font.color.rgb = blue
    doc.add_paragraph("Trigger: A client who already exists in your database submits another inquiry or tour booking request.", style='List Bullet')
    doc.add_paragraph("Smart Behavior: The system does not create a duplicate customer; it routes the lead back to their original account rep.", style='List Bullet')

    format_telegram_bubble(doc, "Returning Client Re-Inquiry", [
        "⚠️ EXISTING CUSTOMER RE-INQUIRY",
        "━━━━━━━━━━━━━━━━━━━━━━",
        "👤 Customer: Elizabeth Jenkins",
        "📞 Phone: +1 404 882 1902",
        "✉️ Email: ejenkins@travelers.org",
        "🎒 Interested Tour: 4x4 Off-Road Safari Volta Expedition",
        "📍 Destination: Volta Region",
        "🌐 Source: WhatsApp Inquiry",
        "💼 Assigned To: Emmanuel Tetteh",
        "━━━━━━━━━━━━━━━━━━━━━━",
        "👉 Open CRM Leads Board (http://.../leads)"
    ])

    # Message 3: Lead Qualified -> Deal Created
    h2 = doc.add_heading(level=2)
    r = h2.add_run("4.3 Lead Qualified ➔ Opportunity / Deal Created")
    r.font.color.rgb = blue
    doc.add_paragraph("Trigger: Sales agent changes a lead's stage from CONTACTED to QUALIFIED.", style='List Bullet')
    doc.add_paragraph("What Happens: A Deal is generated in the pipeline with projected revenue so managers can forecast sales.", style='List Bullet')

    format_telegram_bubble(doc, "Opportunity Created", [
        "🎯 LEAD QUALIFIED ➔ NEW OPPORTUNITY CREATED",
        "━━━━━━━━━━━━━━━━━━━━━━",
        "💼 Opportunity: Dr. Kwame Mensah - December in Ghana Heritage Tour",
        "💰 Estimated Value: $4,850 USD",
        "👤 Rep: Sarah Quaye",
        "👉 View in CRM Pipeline (http://.../deals)"
    ])

    # Message 4: Deal Won -> Auto-Invoice
    h2 = doc.add_heading(level=2)
    r = h2.add_run("4.4 Deal Won ➔ Instant SST Invoice Generated")
    r.font.color.rgb = blue
    doc.add_paragraph("Trigger: Sales agent closes the sale and moves the deal stage to WON.", style='List Bullet')
    doc.add_paragraph("What Happens: An official SST Invoice (INV-...) is automatically created and accepted in the database.", style='List Bullet')

    format_telegram_bubble(doc, "Deal Won & Booking Confirmed", [
        "🎉 DEAL WON! NEW BOOKING!",
        "━━━━━━━━━━━━━━━━━━━━━━",
        "💼 Deal: Dr. Kwame Mensah - December in Ghana Heritage Tour",
        "💰 Amount: 4,850 USD",
        "🌟 Sales Rep: Sarah Quaye",
        "📄 Invoice Generated: INV-2026-84912",
        "━━━━━━━━━━━━━━━━━━━━━━",
        "👉 View in CRM (http://.../deals)"
    ])

    # Message 5: Payment Received
    h2 = doc.add_heading(level=2)
    r = h2.add_run("4.5 Payment Confirmed & Official Receipt Issued")
    r.font.color.rgb = blue
    doc.add_paragraph("Trigger: Finance logs a payment (Mobile Money, Card, or Wire) against an invoice.", style='List Bullet')
    doc.add_paragraph("What Happens: Official Receipt (REC-...) is generated, invoice balance updates, and linked tour booking is confirmed.", style='List Bullet')

    format_telegram_bubble(doc, "Payment Confirmed", [
        "💰 PAYMENT CONFIRMED",
        "━━━━━━━━━━━━━━━━━━━━━━",
        "🧾 Receipt: REC-2026-10492",
        "💵 Amount Paid: 4,850 USD",
        "💳 Method: Bank Wire Transfer",
        "👤 Customer: Dr. Kwame Mensah",
        "📄 Invoice: INV-2026-84912",
        "━━━━━━━━━━━━━━━━━━━━━━",
        "👉 View Payments Board (http://.../payments)"
    ])

    # Message 6: Inactivity SLA Escalation
    h2 = doc.add_heading(level=2)
    r = h2.add_run("4.6 Inactivity SLA Escalation (Watchdog Alert)")
    r.font.color.rgb = blue
    doc.add_paragraph("Trigger: A lead assigned to a sales rep has received ZERO updates or follow-up notes for over 48 hours.", style='List Bullet')
    doc.add_paragraph("Purpose: Prevents customer leads from going cold. Alerts management to reassign the lead if necessary.", style='List Bullet')

    format_telegram_bubble(doc, "SLA Inactivity Escalation", [
        "⏱️ SALES INACTIVITY SLA ESCALATION",
        "━━━━━━━━━━━━━━━━━━━━━━",
        "⚠️ LEAD: Marcus Sterling (Private Chauffeur & Fleet Rental)",
        "👤 Assigned To: Michael Addo",
        "⏳ Inactivity Duration: 48 hours with zero updates",
        "━━━━━━━━━━━━━━━━━━━━━━",
        "👉 Take Action in CRM (http://.../leads)"
    ])

    # Message 7: Overdue Invoice Alert
    h2 = doc.add_heading(level=2)
    r = h2.add_run("4.7 Overdue Invoice Aging Notification")
    r.font.color.rgb = blue
    doc.add_paragraph("Trigger: An issued invoice has surpassed its due date by 1 day or more with an outstanding balance.", style='List Bullet')

    format_telegram_bubble(doc, "Overdue Invoice Notice", [
        "⚠️ OVERDUE INVOICE ALERT (Day +1)",
        "━━━━━━━━━━━━━━━━━━━━━━",
        "📄 Invoice: INV-2026-51209",
        "💰 Amount Due: 12,400 GHS",
        "👤 Customer: Apex Logistics Ghana Ltd",
        "📅 Original Due Date: 30/09/2026",
        "━━━━━━━━━━━━━━━━━━━━━━",
        "👉 Review Invoices (http://.../invoices)"
    ])

    # -------------------------------------------------------------------------
    # PART 5: ADMINISTRATOR SETUP & TROUBLESHOOTING
    # -------------------------------------------------------------------------
    h1 = doc.add_heading(level=1)
    r = h1.add_run("5. Telegram Bot Setup & Troubleshooting Guide")
    r.font.color.rgb = navy

    doc.add_paragraph(
        "To connect your Telegram Bot to your Sunseekers CRM instance, follow this 4-step checklist in the Admin Settings:"
    )

    doc.add_paragraph("Step 1: Create Your Bot via @BotFather", style='List Bullet')
    doc.add_paragraph("Open Telegram, search for '@BotFather', and send '/newbot'. Name your bot (e.g., 'Sunseekers Alerts Bot'). Copy the HTTP API token provided (e.g. 7123456789:ABCdefGhIJKlmNoPQRstuvWXyz...).", style='List Bullet 2')
    
    doc.add_paragraph("Step 2: Add Bot as an Administrator to Your Group", style='List Bullet')
    doc.add_paragraph("Open your staff group or channel, tap Group Settings > Administrators > Add Administrator. Search for your bot username and give it permission to 'Post Messages'. This is mandatory for Telegram to allow delivery.", style='List Bullet 2')

    doc.add_paragraph("Step 3: Retrieve and Format the Chat ID", style='List Bullet')
    doc.add_paragraph("For channels and supergroups, Telegram chat IDs are negative numbers beginning with '-100' (e.g. -1004372404185). If you enter 1004372404185, the Sunseekers CRM auto-resolves and tests the prefix automatically.", style='List Bullet 2')

    doc.add_paragraph("Step 4: Save & Test Connection", style='List Bullet')
    doc.add_paragraph("Navigate to Settings > Automations & Integrations. Paste the Bot Token, enter the Chat ID, and click 'Test Telegram Bot Ping'. The system verifies your bot with Telegram and immediately sends a green verification message to your channel.", style='List Bullet 2')

    add_callout(doc, [
        "🔒 Security Note Regarding Password Autofill:",
        "Your browser's password manager may occasionally try to autofill your admin login password into the Bot Token input field.",
        "Always click '👁️ Show Token' to confirm that the text displayed is your actual @BotFather API token and not your login password dots before clicking Test Ping."
    ], border_color="D97706", bg_color="FFFBEB")

    # -------------------------------------------------------------------------
    # PART 6: STAFF BEST PRACTICES
    # -------------------------------------------------------------------------
    h1 = doc.add_heading(level=1)
    r = h1.add_run("6. Staff Best Practices & Daily Routine")
    r.font.color.rgb = navy

    doc.add_paragraph("1. Morning Review (08:30 GMT): Every sales agent opens the Leads Board. Review tasks due today, check the in-app notification bell, and action any leads older than 24 hours.", style='List Bullet')
    doc.add_paragraph("2. Lead Qualification: Always ask group size, travel dates, and accommodation preference before moving a lead to QUALIFIED.", style='List Bullet')
    doc.add_paragraph("3. Fleet & Dispatch Coordination: Operations coordinators verify vehicle status every morning. Ensure assigned drivers have acknowledged their tour itineraries 24 hours in advance.", style='List Bullet')
    doc.add_paragraph("4. Prompt Payment Entry: Log all incoming MoMo and Wire receipts immediately so customers receive their instant confirmation and booking holds are released.", style='List Bullet')

    # Save document
    filename = "Sunseekers_CRM_User_Training_and_Automations_Guide.docx"
    doc.save(filename)
    print(f"Document successfully created: {filename}")

if __name__ == "__main__":
    generate_manual()
