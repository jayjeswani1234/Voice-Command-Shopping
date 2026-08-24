const TABS = [
  {
    id: 'list',
    label: 'List',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M8 6h13M8 12h13M8 18h13" strokeLinecap="round" />
        <circle cx="3.5" cy="6" r="1.5" />
        <circle cx="3.5" cy="12" r="1.5" />
        <circle cx="3.5" cy="18" r="1.5" />
      </svg>
    ),
  },
  {
    id: 'recs',
    label: 'For you',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 3l2.6 5.6 6.1.6-4.6 4.1 1.3 6-5.4-3.2-5.4 3.2 1.3-6-4.6-4.1 6.1-.6z" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: 'search',
    label: 'Browse',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-4-4" strokeLinecap="round" />
      </svg>
    ),
  },
];

export function BottomNav({ active, onChange }) {
  return (
    <nav className="bottom-nav" aria-label="Sections">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          className="bottom-nav__btn"
          aria-current={active === tab.id}
          onClick={() => onChange(tab.id)}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
