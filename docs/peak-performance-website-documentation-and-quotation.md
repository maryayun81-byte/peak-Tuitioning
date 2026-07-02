# Peak Performance Tutoring Website Documentation and Quotation

Prepared for: Peak Performance Tutoring  
Prepared by: Senior Software Engineering and Product Management Review  
Date: 1 July 2026

## 1. Executive Summary

The Peak Performance Tutoring website is not a basic company website. It is a public admissions, marketing, support, content and operations platform for a Kenyan tutoring business serving KCSE 8-4-4 and CBC learners.

The platform combines:

- A premium public landing page for parents and students.
- Tuition event discovery and registration.
- Class-specific slots, fees, posters, dates and location display.
- Testimonials collection and display.
- Blog/news publishing for SEO and parent education.
- A responsive contact page with WhatsApp support.
- APEX public tutoring assistant with human handoff.
- Admin dashboards for managing content, tuition events, registrations, support and operations.
- Supabase-backed database security, storage and role-based access.

The business value is clear: the website does not only introduce Peak Performance. It captures leads, registers learners, answers parent questions, supports admissions and improves search visibility through structured content.

## 2. Technology Stack

| Layer | Implementation |
| --- | --- |
| Frontend | Next.js App Router, React, TypeScript |
| Styling | Tailwind CSS, responsive components, motion-enhanced UI |
| Backend | Next.js Server Actions and API routes |
| Database | Supabase PostgreSQL |
| Authentication | Supabase Auth with role-aware access |
| Storage | Supabase Storage for posters, blog images and media assets |
| Notifications | In-app notification records, APEX unread counters, web push infrastructure |
| AI Support | APEX assistant with provider fallback architecture |
| Deployment | Modern serverless/web hosting target |
| SEO | Metadata, public routes, blog articles, structured public content |

## 3. Public Website Features

### 3.1 Landing Page

The landing page is designed as the main conversion surface for parents and learners.

Implemented features:

- Premium hero section with classroom visual identity.
- Clear KCSE and CBC tuition positioning.
- Upcoming tuition programmes shown near the top.
- Event cards with poster imagery, dates, charges and remaining slots.
- Parent/student outcome-focused copy.
- Testimonials carousel.
- Blog/latest-news rail.
- Contact and registration calls to action.
- Mobile-responsive navigation with portal links and exploration links.
- APEX floating support assistant.

Business purpose:

- Build trust quickly.
- Make available programmes visible early.
- Reduce parent uncertainty.
- Convert visitors into registrations or support conversations.

### 3.2 Tuition Events and Programme Registration

The platform supports tuition events such as holiday tuition, group tuition and academic intakes.

Implemented features:

- Public event registration page.
- Admin-created tuition events.
- Event posters and image presentation.
- Event location.
- Start and end date/time.
- Class and curriculum slot allocation.
- Remaining slots display.
- Class-specific pricing and payment frequency.
- Curriculum/class selection.
- Student and parent details.
- Subject performance collection.
- Registration success feedback and redirect behavior.

Operational value:

- Admins can open or close real intakes.
- Parents see whether places are still available.
- Peak can segment learners by curriculum, class and academic need.

### 3.3 Testimonials

Implemented features:

- Public testimonials display.
- Parent/student/teacher role capture.
- Testimonial submission form.
- Immediate display after successful submission.
- Toast confirmation.
- Admin-shareable testimonial section link.
- Database-backed testimonial storage.
- Published/unpublished control through the database/admin flow.

Business value:

- Builds social proof.
- Helps new parents trust the brand.
- Creates reusable marketing evidence.

### 3.4 Blog and Latest News

Implemented features:

- Public blog listing page.
- Individual article pages.
- Latest-news rail on the landing page.
- Admin blog creation.
- Blog title, excerpt, body, cover image and crop positioning.
- Edit and delete capability.
- Published/unpublished support.
- SEO-friendly article URLs using slugs.
- Article page experience with editorial layout.

Marketing value:

- Blog posts can target searches such as KCSE tuition Kenya, CBC tuition Kenya, holiday tuition, Form 4 revision, Grade 9 CBC support and parent education queries.
- Consistent publishing improves topical authority over time.
- Articles give Peak more pages that can rank beyond the home page.

### 3.5 Contact Page

Implemented features:

- Dedicated contact page.
- Phone contact: 0798971625.
- WhatsApp action button.
- Physical location reference: St Ignatius Christian School, Kinoo.
- Responsive layout for mobile and desktop.

Business value:

- Reduces friction for parents who want direct communication.
- Supports both online and physical-location trust.

## 4. APEX Public Support Assistant

APEX is the public-facing support and tutoring assistant.

Implemented capabilities:

- Floating support button.
- Branded APEX assistant profile image.
- Chat window and full-screen mode.
- New conversation support.
- Clear conversation support.
- Conversation memory in local storage.
- Queued messages while AI is thinking.
- Message steering, editing and deletion before processing.
- Human handoff button.
- Admin support inbox for APEX handoffs.
- Unread admin count.
- Admin replies visible inside the visitor's APEX chat.
- Result slip upload and AI-supported academic feedback.
- Tuition guidance for home tuition and group tuition.
- Upcoming event awareness for group tuition.
- Registration support flow connected to event registration.

Academic diagnosis principle:

APEX is designed not to jump to conclusions from grades alone. It should ask focused follow-up questions about curriculum, class, subject weakness, study habits, learning environment, classroom experience, mindset, exam technique and foundational gaps before making a confident diagnosis.

Business value:

- APEX acts like a 24/7 front desk.
- It reduces repetitive parent questions.
- It collects leads and support requests.
- It can escalate sensitive or high-intent conversations to humans.

## 5. Admin Features

The admin side is an operational control center, not just a static backend.

Implemented or supported admin areas include:

- Dashboard and operational overview.
- Tuition events management.
- Event registrations management.
- Blog/news management.
- APEX messages.
- Support intelligence.
- Student, teacher and parent management areas.
- Attendance, timetable and academic operations areas.
- Notifications.
- Finance/payment-related areas.
- Curriculum, class and subject management.

Admin value:

- Peak can manage marketing, admissions and support from one platform.
- The site becomes part of daily operations, not just advertising.

## 6. Security Implementation

### 6.1 Authentication and Role Control

Security measures:

- Supabase authentication.
- Role-aware admin, teacher, parent and student areas.
- Protected admin routes.
- Server-side operations for sensitive writes.
- Profile loading with timeout handling to reduce hanging sessions.

### 6.2 Database Security

Security measures:

- Supabase Row Level Security enabled on key public and operational tables.
- Public testimonial insertion is limited to required public submission behavior.
- Blog posts use published/unpublished status for public visibility.
- Admin policies allow management where appropriate.
- Event registration data is stored server-side.
- Support handoff and thread data are stored in dedicated tables.

### 6.3 Storage Security

Security measures:

- Dedicated storage bucket strategy for event posters and public media.
- Public media can be served through public URLs where needed.
- Admin upload/manage policies are used for controlled media management.

### 6.4 Input and Data Safety

Security measures:

- Server Actions validate and control important database writes.
- Public forms separate visitor submission from admin management.
- AI support conversations are logged with operational metadata.
- Handoff flows preserve a trail of visitor/admin communication.

### 6.5 SSL

SSL is required for:

- Secure HTTPS browsing.
- Trust in search results and browsers.
- Protection of form submissions.
- Safer login and admin access.

The quotation includes SSL certificate/setup at KES 1,500 as requested.

## 7. Performance and Speed

Performance-oriented implementation:

- Next.js App Router architecture.
- Server Actions for direct server-side workflows.
- Responsive image usage for public visuals.
- Lazy loading for non-critical visual sections where appropriate.
- Public blog/latest-news surfaces loaded as curated lists.
- APEX chat stores recent conversation locally to reduce repeated loading.
- Profile fetch timeout handling to avoid indefinite loading.
- Build scripts include increased Node memory for larger production builds.

Important note:

No fixed Lighthouse score is claimed in this document because a current production Lighthouse audit was not run as part of this documentation. The implementation is structured for good speed, but final numbers should be measured after deployment with production assets and real hosting conditions.

Recommended performance targets:

- Mobile Lighthouse Performance: 80+
- Desktop Lighthouse Performance: 90+
- Largest Contentful Paint: under 2.5 seconds on good 4G
- Cumulative Layout Shift: below 0.1
- First Input Delay / Interaction to Next Paint: kept low through lean public interactions

## 8. SEO Implementation

Implemented SEO foundations:

- Public pages for home, about, contact, blog, tuition center, KCSE/CBC tutoring and holiday tuition.
- Blog article routes with unique slugs.
- Metadata support through Next.js layout/page structure.
- Search-friendly content areas for KCSE, CBC, holiday tuition and parent decision-making.
- Real public testimonials and events to strengthen credibility.
- Clear navigation paths.

Recommended SEO next steps:

- Publish 2-4 high-quality articles per month.
- Target local search phrases such as "holiday tuition in Kenya", "KCSE tuition Nairobi", "CBC Grade 9 tuition", "Form 4 revision classes" and "tuition center in Kinoo".
- Add FAQ sections to high-intent pages.
- Submit sitemap to Google Search Console and Bing Webmaster Tools.
- Add organization, local business, article and event structured data.
- Build genuine backlinks from school/community/education partners.

## 9. Market Pricing Context

The quotation below is based on the fact that this platform is more advanced than a simple static business website.

Pricing references checked:

1. Truehost Kenya lists web design services with a simple site package at KES 10,000 and an e-commerce website at KES 40,000, including items like mobile-responsive UI, basic SEO, analytics, SSL setup and basic security setup. Source: https://truehost.co.ke/web-design-service/
2. Truehost Kenya also lists web hosting from KES 2,500 per year and web design service references from KES 15,600 in its navigation/pricing references. Source: https://truehost.co.ke/ssl-certificates/
3. TechRadar's website cost guide notes that custom-coded websites commonly start around USD 5,000 and can rise much higher depending on scope, while website builders are cheaper but less flexible. Source: https://www.techradar.com/news/how-much-does-it-cost-to-build-a-website

Conclusion:

A simple Kenyan brochure site can be priced far lower. Peak Performance Tutoring is a custom operational platform with admin tools, database-backed content, registration workflows, APEX support, notifications and SEO publishing. The quote should therefore be above a basic website package, but still controlled and fair.

## 10. Quotation

Currency: Kenya Shillings (KES)

| Item | Description | Cost |
| --- | --- | ---: |
| Product planning and information architecture | User journeys, parent/student conversion path, admin workflow mapping and feature structure | 15,000 |
| UI/UX design and responsive public website | Premium landing page, contact page, blog surfaces, event cards, mobile navigation and visual polish | 35,000 |
| Frontend implementation | Next.js public pages, responsive components, forms, carousels, article pages and landing sections | 40,000 |
| Supabase database and backend workflows | Server Actions, registrations, testimonials, blog data, event data and support conversation persistence | 35,000 |
| Admin content management | Blog CRUD, event management, poster/crop support, pricing, slots, registrations and support management surfaces | 35,000 |
| Tuition event registration system | Multi-step registration, curriculum/class slots, remaining places, class pricing and event metadata | 25,000 |
| APEX support assistant and human handoff | Floating assistant, conversation memory, result slip handling, queued messages, admin inbox and unread counts | 40,000 |
| Security hardening | Role-aware route protection, RLS policies, secure form writes, storage policy setup and admin access controls | 20,000 |
| SEO foundation | Metadata, blog/news architecture, content structure and search-friendly public pages | 15,000 |
| QA, deployment support and performance tuning | Cross-device checks, form testing, admin workflow checks and production readiness support | 20,000 |
| Hosting | Provided free as agreed | 0 |
| SSL certificate/setup | HTTPS/security certificate allowance requested | 1,500 |
| **Total** |  | **281,500** |

## 11. What Is Included

Included:

- Public website implementation.
- Admin management surfaces listed above.
- Supabase database schema/policies needed for implemented flows.
- Public support assistant integration and handoff flow.
- Event registration workflow.
- Blog/news publishing workflow.
- Testimonial submission/display workflow.
- Responsive design for desktop and mobile.
- Basic SEO implementation.
- Deployment support.
- SSL setup allowance.
- Free hosting as agreed.

## 12. What Is Not Included

Not included unless separately agreed:

- Paid AI provider credits.
- Paid SMS bundles.
- Paid email delivery service fees.
- Paid domain renewal fees.
- Paid stock photography.
- Long-term content writing for blogs.
- Long-term monthly maintenance.
- Paid SEO campaigns or backlink outreach.
- Payment gateway transaction fees.

## 13. Recommended Maintenance Plan

Monthly maintenance is recommended because this is an operational platform.

Suggested maintenance scope:

- Software updates.
- Security review.
- Bug fixes.
- Content publishing support.
- Supabase backup checks.
- SEO monitoring.
- Admin support.
- Performance checks.

Suggested maintenance fee:

- KES 10,000 to KES 20,000 per month depending on support intensity.

## 14. Professional Assessment

This website should be treated as a serious business system. A basic brochure website only explains a company. This platform explains Peak Performance, captures registrations, supports parents, displays programmes, publishes content, manages testimonials and gives visitors immediate assistance through APEX.

The KES 281,500 quotation is justified because it covers a custom education platform with public, admin, support and content operations. It remains controlled because hosting is charged at KES 0 and the SSL line is kept at the requested KES 1,500.

The next highest-impact improvements are:

- Add structured data for events, articles and local business SEO.
- Run a production Lighthouse audit after deployment.
- Add a sitemap and submit to Google/Bing.
- Continue publishing high-quality blog articles.
- Track registration conversions and APEX handoff outcomes.
