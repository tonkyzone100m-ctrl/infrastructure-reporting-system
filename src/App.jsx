import { useEffect, useState } from 'react'

const reports = [
  { id: 'RH-10482', title: 'Large pothole on Kacyiru Avenue', type: 'Roads', status: 'In progress', date: 'Oct 10, 2026', location: 'Kacyiru, Kigali' },
  { id: 'RH-10467', title: 'Street light not working', type: 'Street lighting', status: 'Received', date: 'Oct 08, 2026', location: 'Kimihurura, Kigali' },
  { id: 'RH-10391', title: 'Blocked storm drain', type: 'Drainage', status: 'Resolved', date: 'Sep 24, 2026', location: 'Nyamirambo, Kigali' },
]

const urgentCategories = ['Roads & pavements', 'Water & drainage', 'Drainage']

const translations = {
  en: {
    home: 'Home', reports: 'My reports', help: 'Help centre', signIn: 'Sign in',
    create: 'Create report', reportIssue: 'Report an issue', viewReports: 'View your reports',
    newReport: 'New report', backReports: 'Back to your reports', submit: 'Submit report',
    language: 'Language', english: 'English', kinyarwanda: 'Kinyarwanda',
    yourActivity: 'Your activity', keepTrack: 'Keep track of the issues you have raised and their progress.',
    makeDifference: 'Make a difference', tellUs: 'Tell us what is happening and we’ll make sure it reaches the right team.',
    helpTitle: 'How can we help?', helpIntro: 'Everything you need to know about making a useful report.',
    whatIssue: 'What’s the issue?', tellMore: 'Tell us more', where: 'Where is it?', evidence: 'Add evidence',
    chooseCategory: 'Choose the category that best describes the problem.', title: 'Short title',
    description: 'Description', location: 'Location', private: 'Your information is kept private.',
    chooseImage: 'Choose an image', imageHelp: 'PNG, JPG or WEBP', reportSaved: 'Report saved',
    thankYou: 'Thank you for speaking up.', viewMyReports: 'View my reports', backHome: 'Back to home',
    received: 'Received', inProgress: 'In progress', resolved: 'Resolved', allStatuses: 'All statuses',
  },
  rw: {
    home: 'Ahabanza', reports: 'Raporo zanjye', help: 'Ubufasha', signIn: 'Injira',
    create: 'Kora raporo', reportIssue: 'Tanga raporo', viewReports: 'Reba raporo zawe',
    newReport: 'Raporo nshya', backReports: 'Subira kuri raporo zawe', submit: 'Ohereza raporo',
    language: 'Ururimi', english: 'Icyongereza', kinyarwanda: 'Kinyarwanda',
    yourActivity: 'Ibikorwa byawe', keepTrack: 'Kurikirana ibibazo watanze n’uko biri gukemuka.',
    makeDifference: 'Gira uruhare', tellUs: 'Tubwire ikibazo maze tugishyikirize abashinzwe kugikemura.',
    helpTitle: 'Twagufasha dute?', helpIntro: 'Menya uko watanga raporo yumvikana kandi yuzuye.',
    whatIssue: 'Ikibazo ni iki?', tellMore: 'Tanga ibisobanuro', where: 'Aho ikibazo kiri', evidence: 'Ongeraho ifoto',
    chooseCategory: 'Hitamo icyiciro gisobanura neza ikibazo.', title: 'Umutwe mugufi',
    description: 'Ibisobanuro', location: 'Aho kiri', private: 'Amakuru yawe ararinzwe.',
    chooseImage: 'Hitamo ifoto', imageHelp: 'PNG, JPG cyangwa WEBP', reportSaved: 'Raporo yakiriwe',
    thankYou: 'Murakoze gutanga amakuru.', viewMyReports: 'Reba raporo zanjye', backHome: 'Subira ahabanza',
    received: 'Yakiriwe', inProgress: 'Irimo gukorwa', resolved: 'Yakemutse', allStatuses: 'Ibyiciro byose',
  },
}

function useCopy(language) {
  return translations[language] || translations.en
}

function analyseReport(report) {
  const ageInDays = Math.max(0, Math.floor((Date.now() - new Date(report.created_at || Date.now()).getTime()) / 86400000))
  let score = report.status === 'Received' ? 35 : report.status === 'In progress' ? 20 : 0
  if (urgentCategories.includes(report.category)) score += 25
  if (report.evidence_name) score += 15
  if (ageInDays >= 3) score += Math.min(20, ageInDays * 2)
  return { ...report, ageInDays, urgencyScore: Math.min(100, score) }
}

function Icon({ name, size = 20 }) {
  const paths = {
    arrow: <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
    plus: <><path d="M12 5v14" /><path d="M5 12h14" /></>,
    search: <><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></>,
    menu: <><path d="M4 7h16" /><path d="M4 12h16" /><path d="M4 17h16" /></>,
    close: <><path d="m6 6 12 12" /><path d="m18 6-12 12" /></>,
    pin: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
    clock: <><circle cx="12" cy="12" r="8" /><path d="M12 7v5l3 2" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    chevron: <path d="m6 9 6 6 6-6" />,
    user: <><circle cx="12" cy="8" r="3" /><path d="M5 20c.8-3.3 3.2-5 7-5s6.2 1.7 7 5" /></>,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}

function Button({ children, variant = 'primary', icon, onClick, type = 'button' }) {
  return <button type={type} className={`button button-${variant}`} onClick={onClick}>{children}{icon && <Icon name={icon} size={17} />}</button>
}

function Header({ navigate, user, onSignOut, language, setLanguage }) {
  const [open, setOpen] = useState(false)
  const copy = useCopy(language)
  const items = [['Home', 'home'], ['My reports', 'reports'], ['Help centre', 'help']]
  return <header className="site-header"><div className="container header-inner">
    <button className="brand" onClick={() => navigate('home')}><span className="brand-mark">R</span><span>Report<span>Hub</span></span></button>
    <nav className={`main-nav ${open ? 'is-open' : ''}`}>{items.map(([key, page]) => <button key={page} className={page === 'home' ? 'active' : ''} onClick={() => { navigate(page); setOpen(false) }}>{copy[key === 'Home' ? 'home' : key === 'My reports' ? 'reports' : 'help']}</button>)}<Button variant="dark" onClick={() => { navigate(user ? 'report' : 'login'); setOpen(false) }} icon="plus">{copy.create}</Button></nav>
    <div className="header-actions"><label className="language-picker"><span>{copy.language}</span><select aria-label={copy.language} value={language} onChange={event => setLanguage(event.target.value)}><option value="en">{copy.english}</option><option value="rw">{copy.kinyarwanda}</option></select></label><button className="icon-button" aria-label="Open help and search" onClick={() => navigate('help')}><Icon name="search" /></button>{user ? <button className="avatar" aria-label="Sign out" onClick={onSignOut}>{user.initials}</button> : <button className="header-login" onClick={() => navigate('login')}>{copy.signIn}</button>}<button className="menu-button" onClick={() => setOpen(!open)} aria-label="Toggle menu"><Icon name={open ? 'close' : 'menu'} /></button></div>
  </div></header>
}

function Status({ children }) {
  const tone = children === 'Resolved' ? 'success' : children === 'In progress' ? 'warning' : 'neutral'
  return <span className={`status status-${tone}`}><span />{children}</span>
}

function Home({ navigate, language }) {
  const copy = useCopy(language)
  return <main><section className="hero"><div className="container hero-grid"><div className="hero-copy"><span className="eyebrow">{language === 'rw' ? 'Ijwi ry’abaturage' : 'Your civic voice'}</span><h1>{language === 'rw' ? <>Raporo nto.<br /><em>Impinduka nini.</em></> : <>Small reports.<br /><em>Big change.</em></>}</h1><p>{language === 'rw' ? 'Fasha guteza imbere aho utuye. Tanga raporo ku bibazo rusange, ukurikire uko bikemuka.' : 'Help make your neighbourhood better. Report public issues, follow the progress, and see the difference we can make together.'}</p><div className="hero-actions"><Button onClick={() => navigate('report')} icon="arrow">{copy.reportIssue}</Button><button className="text-button" onClick={() => navigate('reports')}>{copy.viewReports} <Icon name="arrow" size={16} /></button></div><div className="trust-line"><span className="avatar-stack"><i>J</i><i>M</i><i>K</i></span><span><strong>12,480+</strong> {language === 'rw' ? 'raporo zatanzwe n’abaturage' : 'reports submitted by your community'}</span></div></div><div className="hero-visual"><div className="city-card"><div className="city-top"><span className="live-dot" />{language === 'rw' ? 'Ibikorwa by’abaturage' : 'Live community activity'} <span>•••</span></div><div className="city-art"><span className="road road-one" /><span className="road road-two" /><span className="building building-one" /><span className="building building-two" /><span className="building building-three" /><span className="tree tree-one" /><span className="tree tree-two" /><span className="map-pin pin-one"><Icon name="pin" size={14} /></span><span className="map-pin pin-two"><Icon name="pin" size={14} /></span></div><div className="city-footer"><div><strong>58</strong><span>{language === 'rw' ? 'ibibazo byakemutse' : 'issues resolved'}<br />{language === 'rw' ? 'muri uku kwezi' : 'this month'}</span></div><div className="mini-chart"><i /><i /><i /><i /><i /><i /><i /></div></div></div><div className="floating-note"><span className="note-icon"><Icon name="check" size={16} /></span><span><b>{language === 'rw' ? 'Ikibazo cyakemutse' : 'Issue resolved'}</b><small>Street light · 2 min ago</small></span></div></div></div></section><section className="container stat-row"><div><strong>12,480</strong><span>{language === 'rw' ? 'Raporo zatanzwe' : 'Reports submitted'}</span></div><div><strong>8,932</strong><span>{language === 'rw' ? 'Ibibazo byakemutse' : 'Issues resolved'}</span></div><div><strong>72%</strong><span>{language === 'rw' ? 'Ibibazo byakemutse' : 'Resolution rate'}</span></div><div><strong>24h</strong><span>{language === 'rw' ? 'Igihe cyo gusubizwa' : 'Average response'}</span></div></section><section className="section container"><div className="section-heading"><div><span className="eyebrow">{language === 'rw' ? 'Uko bikora' : 'How it works'}</span><h2>{language === 'rw' ? <>Kuva kubona ikibazo kugeza <em>gikemutse.</em></> : <>From noticing to <em>solving.</em></>}</h2></div><p>{language === 'rw' ? 'Buri raporo ifasha kumenya ibyo abaturage bakeneye cyane.' : 'Every report helps build a clearer picture of what your community needs most.'}</p></div><div className="steps"><article><span className="step-number">01</span><h3>{language === 'rw' ? 'Bona ikibazo' : 'Spot an issue'}</h3><p>{language === 'rw' ? 'Reba ikibazo gikeneye kwitabwaho. Buri makuru ni ingenzi.' : 'See something that needs attention? Every detail matters.'}</p><button onClick={() => navigate('report')}>{language === 'rw' ? 'Menya byinshi' : 'Learn more'} <Icon name="arrow" size={15} /></button></article><article><span className="step-number">02</span><h3>{language === 'rw' ? 'Tanga raporo' : 'Make a report'}</h3><p>{language === 'rw' ? 'Sangiza amakuru n’aho ikibazo kiri mu ntambwe nke.' : 'Share the details and location in a few simple steps.'}</p><button onClick={() => navigate('report')}>{copy.reportIssue} <Icon name="arrow" size={15} /></button></article><article><span className="step-number">03</span><h3>{language === 'rw' ? 'Reba impinduka' : 'See the change'}</h3><p>{language === 'rw' ? 'Kurikirana uko raporo yawe iva ku yakiriwe ikagera ku yakemutse.' : 'Follow updates as your report moves from received to resolved.'}</p><button onClick={() => navigate('reports')}>{language === 'rw' ? 'Kurikirana' : 'Track progress'} <Icon name="arrow" size={15} /></button></article></div></section><section className="impact-section"><div className="container impact-grid"><div><span className="eyebrow light">{language === 'rw' ? 'Ishusho nini' : 'The bigger picture'}</span><h2>{language === 'rw' ? <>Amakuru meza.<br /><em>Ibyemezo byiza.</em></> : <>Better information.<br /><em>Better decisions.</em></>}</h2></div><p>{language === 'rw' ? 'Iyo abaturage batanga amakuru, abashinzwe serivisi bamenya aho batangira.' : 'When communities speak up, local teams can focus resources where they matter most.'}</p><Button variant="light" onClick={() => navigate('help')} icon="arrow">{language === 'rw' ? 'Menya ReportHub' : 'Learn about ReportHub'}</Button></div></section></main>
}

function Reports({ navigate, language }) {
  const copy = useCopy(language)
  const [items, setItems] = useState([])
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState('All statuses')
  useEffect(() => {
    fetch('http://localhost:3000/api/reports')
      .then(response => response.ok ? response.json() : response.json().then(body => Promise.reject(new Error(body.message))))
      .then(setItems)
      .catch(fetchError => setError(fetchError.message))
  }, [])
  const filteredItems = statusFilter === 'All statuses' ? items : items.filter(item => item.status === statusFilter)
  return <main className="page"><div className="container"><div className="page-intro"><div><span className="eyebrow">{copy.yourActivity}</span><h1>{copy.reports}</h1><p>{copy.keepTrack}</p></div><Button onClick={() => navigate('report')} icon="plus">{copy.newReport}</Button></div><div className="toolbar"><div className="search-field"><Icon name="search" size={18} /><input placeholder={language === 'rw' ? 'Shakisha raporo' : 'Search your reports'} /></div><select className="filter-button" value={statusFilter} onChange={event => setStatusFilter(event.target.value)}><option value="All statuses">{copy.allStatuses}</option><option value="Received">{copy.received}</option><option value="In progress">{copy.inProgress}</option><option value="Resolved">{copy.resolved}</option></select></div>{error && <div className="form-error" role="alert">{error}</div>}{!error && items.length === 0 && <p className="empty-state">{language === 'rw' ? 'Nta raporo urabika. Tanga raporo ya mbere uyibone hano.' : 'No saved reports yet. Submit your first report to see it here.'}</p>}{!error && items.length > 0 && filteredItems.length === 0 && <p className="empty-state">{language === 'rw' ? 'Nta raporo ihuye n’iki cyiciro.' : 'No reports match this status.'}</p>}<div className="report-list">{filteredItems.map(report => <article className="report-card" key={report.id}><div className="report-card-main"><div className="report-icon"><Icon name="pin" /></div><div><div className="report-meta"><span>{report.reference}</span><span>·</span><span>{new Date(report.created_at).toLocaleDateString()}</span></div><h3>{report.title}</h3><p><Icon name="pin" size={14} />{report.location}</p></div></div><div className="report-card-side"><Status>{report.status}</Status><button onClick={() => navigate('detail')}>{language === 'rw' ? 'Reba ibisobanuro' : 'View details'} <Icon name="arrow" size={15} /></button></div></article>)}</div></div></main>
}

function UserLogin({ navigate, onLogin }) {
  const [error, setError] = useState('')
  const submit = event => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const email = String(form.get('email')).trim()
    if (email === 'demo@example.com' && form.get('password') === 'password123') {
      onLogin({ name: 'Demo User', initials: 'DU', email })
      navigate('reports')
    } else {
      setError('Incorrect email or password. Use the demo credentials shown below.')
    }
  }
  return <main className="auth-page"><div className="auth-card"><button className="brand" onClick={() => navigate('home')}><span className="brand-mark">R</span><span>Report<span>Hub</span></span></button><span className="eyebrow">Your account</span><h1>Welcome back.</h1><p>Sign in to view your reports, follow progress, and submit a new issue.</p><form onSubmit={submit}><label className="field-label">Email address<input name="email" type="email" autoComplete="username" required placeholder="you@example.com" /></label><label className="field-label">Password<input name="password" type="password" autoComplete="current-password" required placeholder="Enter your password" /></label>{error && <div className="form-error" role="alert">{error}</div>}<Button type="submit" icon="arrow">Sign in</Button></form><div className="demo-credentials">Demo account: <b>demo@example.com</b> / <b>password123</b></div><p className="auth-switch">New to ReportHub? <button onClick={() => navigate('register')}>Create an account</button></p></div></main>
}

function Register({ navigate, onRegister }) {
  const submit = event => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const name = String(form.get('name')).trim()
    onRegister({ name, initials: name.split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase(), email: String(form.get('email')).trim() })
    navigate('reports')
  }
  return <main className="auth-page"><div className="auth-card"><button className="brand" onClick={() => navigate('home')}><span className="brand-mark">R</span><span>Report<span>Hub</span></span></button><span className="eyebrow">Join your community</span><h1>Create an account.</h1><p>Keep every report in one place and get updates as issues move forward.</p><form onSubmit={submit}><label className="field-label">Full name<input name="name" required placeholder="Your name" /></label><label className="field-label">Email address<input name="email" type="email" required placeholder="you@example.com" /></label><label className="field-label">Password<input name="password" type="password" minLength="8" required placeholder="At least 8 characters" /></label><Button type="submit" icon="arrow">Create account</Button></form><p className="auth-switch">Already have an account? <button onClick={() => navigate('login')}>Sign in</button></p></div></main>
}

function ReportForm({ navigate, language }) {
  const copy = useCopy(language)
  const [submitted, setSubmitted] = useState(false)
  const [reference, setReference] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [evidence, setEvidence] = useState(null)
  const [preview, setPreview] = useState('')
  const selectEvidence = event => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) {
      setError('Please select an image file smaller than 5 MB.')
      event.target.value = ''
      return
    }
    setError('')
    setEvidence(file)
    setPreview(URL.createObjectURL(file))
  }
  const submit = async event => {
    event.preventDefault()
    setSaving(true)
    setError('')
    const form = new FormData(event.currentTarget)
    const fileData = evidence ? await new Promise(resolve => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.readAsDataURL(evidence)
    }) : null
    try {
      const response = await fetch('http://localhost:3000/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: form.get('title'), description: form.get('description'), category: form.get('category'), location: form.get('location'), evidenceName: evidence?.name || null, evidenceData: fileData }),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.message || 'The report could not be saved.')
      setReference(body.reference)
      setSubmitted(true)
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setSaving(false)
    }
  }
  if (submitted) return <main className="page"><div className="success-card"><div className="success-icon"><Icon name="check" size={30} /></div><span className="eyebrow">{copy.reportSaved}</span><h1>{copy.thankYou}</h1><p>{language === 'rw' ? 'Raporo yawe yabitswe kandi yohererejwe abashinzwe kuyikemura.' : 'Your report was saved successfully and sent to the local team.'}</p><div className="reference">{language === 'rw' ? 'Nomero ya raporo' : 'Reference number'} <strong>{reference}</strong></div><div className="hero-actions"><Button onClick={() => navigate('reports')} icon="arrow">{copy.viewMyReports}</Button><button className="text-button" onClick={() => navigate('home')}>{copy.backHome}</button></div></div></main>
  return <main className="page"><div className="container narrow"><div className="page-intro centered"><span className="eyebrow">{copy.makeDifference}</span><h1>{copy.reportIssue}</h1><p>{copy.tellUs}</p></div><form className="form-card" onSubmit={submit}><div className="form-section"><h2>{copy.whatIssue}</h2><p className="muted">{copy.chooseCategory}</p><div className="category-grid">{['Roads & pavements', 'Street lighting', 'Waste & cleanliness', 'Water & drainage', 'Public spaces', 'Other'].map((item, i) => <label className="category" key={item}><input type="radio" name="category" value={item} defaultChecked={i === 0} /><span className="category-symbol">{['⌁', '☼', '▦', '◌', '⌂', '＋'][i]}</span>{item}</label>)}</div></div><div className="form-section"><h2>{copy.tellMore}</h2><label className="field-label">{copy.title}<input name="title" required placeholder={language === 'rw' ? 'Urugero: Umwobo munini mu muhanda' : 'e.g. Large pothole on Main Street'} /></label><label className="field-label">{copy.description}<textarea name="description" required rows="4" placeholder={language === 'rw' ? 'Tanga ibisobanuro byafasha kumva ikibazo...' : 'Add details that could help the team understand the issue...'} /></label></div><div className="form-section"><h2>{copy.where}</h2><label className="field-label">{copy.location}<input name="location" required placeholder={language === 'rw' ? 'Umuhanda, agace cyangwa ahantu hazwi' : 'Street, neighbourhood or landmark'} /></label><div className="location-placeholder"><Icon name="pin" /><span>{language === 'rw' ? 'Aho ikibazo kiri hazagaragara hano' : 'Location preview will appear here'}</span><button type="button">{language === 'rw' ? 'Koresha aho ndi' : 'Use my location'}</button></div></div><div className="form-section"><h2>{copy.evidence}</h2><p className="muted">{language === 'rw' ? 'Ifoto nziza ifasha kumenya no gukemura ikibazo. Ni ubushake, kugeza kuri 5 MB.' : 'A clear photo helps the team verify and resolve the issue faster. Optional, up to 5 MB.'}</p><label className="upload-box"><input type="file" accept="image/*" onChange={selectEvidence} /><span className="upload-icon">＋</span><b>{evidence ? evidence.name : copy.chooseImage}</b><small>{evidence ? (language === 'rw' ? 'Ifoto yatoranyijwe' : 'Image selected') : copy.imageHelp}</small></label>{preview && <img className="evidence-preview" src={preview} alt="Selected evidence preview" />}</div>{error && <div className="form-error form-error-margin" role="alert">{error}</div>}<div className="form-footer"><span className="muted">{copy.private}</span><Button type="submit" icon="arrow">{saving ? (language === 'rw' ? 'Irabikwa...' : 'Saving report...') : copy.submit}</Button></div></form></div></main>
}

function Detail({ navigate }) {
  return <main className="page"><div className="container narrow"><button className="back-button" onClick={() => navigate('reports')}>← Back to your reports</button><div className="detail-header"><div><span className="eyebrow">RH-10482 · Submitted Oct 10, 2026</span><h1>Large pothole on Kacyiru Avenue</h1><p><Icon name="pin" size={16} />Kacyiru, Kigali</p></div><Status>In progress</Status></div><div className="timeline-card"><h2>Report progress</h2><div className="timeline"><div className="timeline-item done"><span><Icon name="check" size={15} /></span><div><b>Report received</b><small>Oct 10, 2026 · Your report was successfully submitted.</small></div></div><div className="timeline-item active"><span><Icon name="clock" size={15} /></span><div><b>Being reviewed</b><small>Our team is assessing the issue and planning next steps.</small></div></div><div className="timeline-item"><span>3</span><div><b>Work scheduled</b><small>We’ll let you know when a team is assigned.</small></div></div><div className="timeline-item"><span>4</span><div><b>Resolved</b><small>The issue is fixed and confirmed.</small></div></div></div></div><div className="detail-note"><b>Have more information?</b><span>You can reply to this report if you have an update or photo to share.</span><button onClick={() => navigate('help')}>Send an update <Icon name="arrow" size={15} /></button></div></div></main>
}

function Help() {
  const faqs = [['What can I report?', 'You can report public issues like damaged roads, broken streetlights, overflowing waste bins, blocked drainage and problems in public spaces.'], ['Do I need an account?', 'No. You can submit a report without an account. Creating one lets you keep all your reports in one place.'], ['How long does it take?', 'Reports are reviewed by the relevant local team. You can follow each update from your reports page.'], ['Can I add photos?', 'Yes. Photos and clear location details help teams understand and verify an issue faster.']]
  return <main className="page"><div className="container help-page"><div className="page-intro centered"><span className="eyebrow">Need a hand?</span><h1>How can we help?</h1><p>Everything you need to know about making a useful report.</p></div><div className="faq-grid">{faqs.map(([q, a]) => <article key={q}><h3>{q}</h3><p>{a}</p><button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>Read more <Icon name="arrow" size={15} /></button></article>)}</div></div></main>
}

function Admin({ navigate, onSignOut }) {
  const [filter, setFilter] = useState('All reports')
  const [items, setItems] = useState([])
  const [error, setError] = useState('')
  useEffect(() => {
    fetch('http://localhost:3000/api/reports')
      .then(response => response.ok ? response.json() : response.json().then(body => Promise.reject(new Error(body.message))))
      .then(setItems)
      .catch(fetchError => setError(fetchError.message))
  }, [])
  const visibleReports = filter === 'All reports' ? items : items.filter(report => report.status === filter)
  const statusCounts = ['Received', 'In progress', 'Resolved'].map(status => ({ status, count: items.filter(item => item.status === status).length }))
  const maxStatusCount = Math.max(1, ...statusCounts.map(item => item.count))
  const categoryCounts = Object.entries(items.reduce((result, item) => ({ ...result, [item.category]: (result[item.category] || 0) + 1 }), {})).sort((a, b) => b[1] - a[1]).slice(0, 5)
  const resolvedCount = items.filter(item => item.status === 'Resolved').length

  return <main className="page admin-page"><div className="container">
    <div className="admin-nav"><b>ReportHub Admin</b><div><button className="active" onClick={() => navigate('admin')}>Overview</button><button onClick={() => navigate('admin-analyser')}>Smart analyser</button><button onClick={onSignOut}>Sign out</button></div></div>
    <div className="admin-heading"><div><span className="eyebrow">Operations workspace</span><h1>Admin overview</h1><p>Review community reports and keep residents informed.</p></div><div className="admin-heading-actions"><button className="back-button" onClick={() => navigate('home')}>View public portal</button><button className="admin-signout" onClick={onSignOut}>Sign out</button></div></div>
    <div className="admin-stats"><div><span>Total reports</span><strong>{items.length}</strong><small>Saved in PostgreSQL</small></div><div><span>Awaiting review</span><strong>{items.filter(item => item.status === 'Received').length}</strong><small>Needs attention</small></div><div><span>In progress</span><strong>{items.filter(item => item.status === 'In progress').length}</strong><small>Currently active</small></div><div><span>Resolved</span><strong>{resolvedCount}</strong><small>{items.length ? Math.round(resolvedCount / items.length * 100) : 0}% of all reports</small></div></div>
    <div className="admin-chart-grid"><section className="admin-panel chart-card"><div className="chart-heading"><div><h2>Report status</h2><p>Current workload from PostgreSQL.</p></div><span className="chart-total">{items.length}</span></div><div className="pie-layout"><div className="pie-chart" style={{ background: `conic-gradient(#d8785a 0 ${items.length ? statusCounts[0].count / items.length * 100 : 0}%, #e5b85e ${items.length ? statusCounts[0].count / items.length * 100 : 0}% ${items.length ? (statusCounts[0].count + statusCounts[1].count) / items.length * 100 : 0}%, #4f9b73 ${items.length ? (statusCounts[0].count + statusCounts[1].count) / items.length * 100 : 0}% 100%)` }}><span>{items.length}</span></div><div className="pie-legend">{statusCounts.map((item, index) => <div key={item.status}><i className={`legend-${index}`} /><span>{item.status}</span><b>{item.count}</b></div>)}</div></div></section><section className="admin-panel chart-card"><div className="chart-heading"><div><h2>Top issue categories</h2><p>Bar chart of saved report volume.</p></div></div><div className="bar-chart">{categoryCounts.length ? categoryCounts.map(([category, count]) => <div className="bar-column" key={category}><span>{count}</span><i style={{ height: `${Math.max(6, count / categoryCounts[0][1] * 130)}px` }} /><small>{category}</small></div>) : <p className="empty-state">No category data yet.</p>}</div></section></div>
    <section className="admin-panel"><div className="admin-panel-heading"><div><h2>Recent reports</h2><p>Monitor submissions stored in PostgreSQL.</p></div><div className="admin-filters">{['All reports', 'Received', 'In progress', 'Resolved'].map(option => <button className={filter === option ? 'selected' : ''} key={option} onClick={() => setFilter(option)}>{option}</button>)}</div></div>{error && <div className="form-error" role="alert">{error}</div>}<div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Report</th><th>Category</th><th>Submitted</th><th>Status</th><th>Action</th></tr></thead><tbody>{visibleReports.map(report => <tr key={report.id}><td><b>{report.title}</b><small>{report.reference} · {report.location}</small></td><td>{report.category}</td><td>{new Date(report.created_at).toLocaleDateString()}</td><td><Status>{report.status}</Status></td><td><button onClick={() => navigate('admin-analyser')}>Analyse <Icon name="arrow" size={14} /></button></td></tr>)}</tbody></table></div>{!error && items.length === 0 && <p className="empty-state">No reports have been saved yet.</p>}</section>
  </div></main>
}

function AdminAnalyser({ navigate, onSignOut }) {
  const [items, setItems] = useState([])
  const [error, setError] = useState('')
  useEffect(() => {
    fetch('http://localhost:3000/api/reports')
      .then(response => response.ok ? response.json() : response.json().then(body => Promise.reject(new Error(body.message))))
      .then(setItems)
      .catch(fetchError => setError(fetchError.message))
  }, [])
  const analysed = items.map(analyseReport)
  const categories = items.reduce((result, item) => ({ ...result, [item.category]: (result[item.category] || 0) + 1 }), {})
  const topCategory = Object.entries(categories).sort((a, b) => b[1] - a[1])[0]
  const urgentReports = analysed.filter(item => item.status !== 'Resolved').sort((a, b) => b.urgencyScore - a.urgencyScore)
  const unresolved = analysed.filter(item => item.status !== 'Resolved').length
  const resolutionRate = items.length ? Math.round((items.filter(item => item.status === 'Resolved').length / items.length) * 100) : 0
  const avgUrgency = analysed.length ? Math.round(analysed.reduce((sum, item) => sum + item.urgencyScore, 0) / analysed.length) : 0
  return <main className="page admin-page"><div className="container">
    <div className="admin-nav"><b>ReportHub Admin</b><div><button onClick={() => navigate('admin')}>Overview</button><button className="active" onClick={() => navigate('admin-analyser')}>Smart analyser</button><button onClick={onSignOut}>Sign out</button></div></div>
    <div className="admin-heading"><div><span className="eyebrow">Evidence-based planning</span><h1>Smart analyser</h1><p>Recommendations and forecasts calculated from saved reports.</p></div></div>
    {error && <div className="form-error" role="alert">{error}</div>}
    <div className="analysis-grid"><section className="admin-panel"><span className="analysis-kicker">AI priority recommendation</span><h2>{urgentReports[0] ? `Review ${urgentReports[0].reference} first` : 'Waiting for report data'}</h2><p>{urgentReports[0] ? `This ${urgentReports[0].category.toLowerCase()} report has a priority score of ${urgentReports[0].urgencyScore}/100. It is ${urgentReports[0].status.toLowerCase()}${urgentReports[0].evidence_name ? ' and includes evidence' : ''}.` : 'Connect the PostgreSQL database and submit reports to generate recommendations.'}</p><div className="analysis-metric"><strong>{avgUrgency}</strong><span>average urgency score</span></div></section><section className="admin-panel"><span className="analysis-kicker">AI workload prediction</span><h2>{items.length ? `${resolutionRate}% resolved` : 'No forecast yet'}</h2><p>{items.length ? `${unresolved} open report${unresolved === 1 ? '' : 's'} remain. Based on current status mix, the queue is predicted to be ${unresolved > items.length / 2 ? 'high' : 'manageable'} until the next review cycle.` : 'A forecast appears after real report data is available.'}</p><div className="forecast-bar"><span style={{ width: `${resolutionRate}%` }} /></div></section></div>
    <section className="admin-panel analyser-table"><div className="admin-panel-heading"><div><h2>Urgent issue queue</h2><p>Explainable scoring: status, category risk, report age, and evidence.</p></div></div>{urgentReports.length ? <div className="urgent-list">{urgentReports.slice(0, 5).map(report => <div className="urgent-row" key={report.id}><div><b>{report.reference}</b><span>{report.title}</span><small>{report.category} · {report.ageInDays} day{report.ageInDays === 1 ? '' : 's'} old</small></div><strong>{report.urgencyScore}<small>/100</small></strong></div>)}</div> : <p className="empty-state">No urgent report signals are available yet.</p>}</section>
  </div></main>
}

function AdminLogin({ navigate, onLogin }) {
  const [error, setError] = useState('')
  const submit = event => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    if (form.get('email') === 'admin@reporthub.local' && form.get('password') === 'admin123') {
      onLogin()
      navigate('admin')
    } else {
      setError('The admin email or password is incorrect.')
    }
  }

  return <main className="admin-login-page"><div className="admin-login-card"><button className="brand admin-login-brand" onClick={() => navigate('home')}><span className="brand-mark">R</span><span>Report<span>Hub</span></span></button><span className="eyebrow">Restricted workspace</span><h1>Admin sign in</h1><p>Access report operations and community service tools.</p><form onSubmit={submit}><label className="field-label">Admin email<input name="email" type="email" autoComplete="username" required placeholder="admin@reporthub.local" /></label><label className="field-label">Password<input name="password" type="password" autoComplete="current-password" required placeholder="Enter your password" /></label>{error && <div className="form-error" role="alert">{error}</div>}<Button type="submit" variant="dark" icon="arrow">Enter admin panel</Button></form><button className="admin-public-link" onClick={() => navigate('home')}>← Return to public portal</button></div></main>
}

function App() {
  const [page, setPage] = useState(window.location.hash.slice(1) || 'home')
  const [adminAuthenticated, setAdminAuthenticated] = useState(false)
  const [user, setUser] = useState(null)
  const [language, setLanguage] = useState('en')
  useEffect(() => { const update = () => setPage(window.location.hash.slice(1) || 'home'); window.addEventListener('hashchange', update); return () => window.removeEventListener('hashchange', update) }, [])
  const navigate = next => { window.location.hash = next; setPage(next) }
  const signOutAdmin = () => { setAdminAuthenticated(false); navigate('admin-login') }
  const signOutUser = () => { setUser(null); navigate('home') }
  const protectedPage = ['reports', 'report', 'detail'].includes(page)
  const content = page === 'login' ? <UserLogin navigate={navigate} onLogin={setUser} /> : page === 'register' ? <Register navigate={navigate} onRegister={setUser} /> : page === 'reports' && user ? <Reports navigate={navigate} language={language} /> : page === 'report' && user ? <ReportForm navigate={navigate} language={language} /> : page === 'detail' && user ? <Detail navigate={navigate} /> : page === 'help' ? <Help /> : page === 'admin-login' ? <AdminLogin navigate={navigate} onLogin={() => setAdminAuthenticated(true)} /> : page === 'admin' && adminAuthenticated ? <Admin navigate={navigate} onSignOut={signOutAdmin} /> : page === 'admin-analyser' && adminAuthenticated ? <AdminAnalyser navigate={navigate} onSignOut={signOutAdmin} /> : page.startsWith('admin') ? <AdminLogin navigate={navigate} onLogin={() => setAdminAuthenticated(true)} /> : protectedPage ? <UserLogin navigate={navigate} onLogin={setUser} /> : <Home navigate={navigate} language={language} />
  const adminPage = page === 'admin' || page === 'admin-analyser'
  const publicShell = ['login', 'register', 'admin-login'].includes(page) || adminPage
  return <>{!publicShell && <Header navigate={navigate} user={user} onSignOut={signOutUser} language={language} setLanguage={setLanguage} />}{content}{!publicShell && <footer className="site-footer"><div className="container footer-inner"><div><button className="brand footer-brand" onClick={() => navigate('home')}><span className="brand-mark">R</span><span>Report<span>Hub</span></span></button><p>{language === 'rw' ? 'Duteza imbere aho dutuye, raporo imwe ku yindi.' : 'Making communities better, one report at a time.'}</p></div><div className="footer-links"><div><b>{language === 'rw' ? 'Sura' : 'Explore'}</b><button onClick={() => navigate('home')}>{useCopy(language).home}</button><button onClick={() => navigate(user ? 'report' : 'login')}>{useCopy(language).reportIssue}</button><button onClick={() => navigate(user ? 'reports' : 'login')}>{useCopy(language).reports}</button></div><div><b>{language === 'rw' ? 'Ibyerekeye' : 'About'}</b><button onClick={() => navigate('help')}>{useCopy(language).help}</button><button onClick={() => navigate('help')}>{language === 'rw' ? 'Amabanga' : 'Privacy'}</button><button onClick={() => navigate('help')}>{language === 'rw' ? 'Twandikire' : 'Contact'}</button></div></div></div><div className="container footer-bottom"><span>© 2026 ReportHub</span><span>{language === 'rw' ? 'Yubakiwe abaturage, n’ubwitange.' : 'Built for communities, with care.'}</span></div></footer>}</>
}

export default App
