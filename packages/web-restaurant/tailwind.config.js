/** @type {import('tailwindcss').Config} */
// ─────────────────────────────────────────────────────────────────────────────
//  TASTR  —  Tailwind Design Token Config
//  Extracted from Figma screens (all 5 platforms)
//  Use this file in every web package: web-customer, web-admin, web-restaurant
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],

  theme: {
    extend: {

      // ── COLOUR PALETTE ──────────────────────────────────────────────────────
      colors: {
        // Brand — golden amber (primary CTA, active nav, table headers, highlights)
        brand: {
          50:  '#FBF5E8',   // selected card bg, hover fill
          100: '#F5E6C8',   // section backgrounds, light fills
          200: '#EDD9A3',   // border accents, dividers
          300: '#D9BA6F',   // secondary icon tint
          400: '#C89A48',   // lighter CTA variant
          500: '#C18B3C',   // ★ PRIMARY — buttons, active tabs, chart lines
          600: '#A67830',   // hover state on primary button
          700: '#8B6428',   // pressed / dark variant
          800: '#6D4E1F',   // very dark amber
          900: '#4A3415',   // near-black amber
        },

        // Background surfaces
        bg: {
          // Mobile app warm beige background (seen on all mobile screens)
          app:    '#EDE0CC',
          // Slightly lighter — used mid-page between sections
          section:'#F2E9D8',
          // Web app page background (admin / restaurant / customer web)
          page:   '#FAF7F2',
          // White card surface
          card:   '#FFFFFF',
          // Input background (slight cream)
          input:  '#FAFAF8',
        },

        // Border colours
        border: {
          DEFAULT: '#E8D9C0',   // card borders, input outlines
          light:   '#F0E6D6',   // very subtle dividers
          strong:  '#D4C4A8',   // stronger dividers, table rows
          focus:   '#C18B3C',   // brand colour on focus
        },

        // Text
        text: {
          primary:   '#1A1A1A',   // headings, labels, important values
          secondary: '#6B7280',   // sub-labels, descriptions
          muted:     '#9CA3AF',   // placeholders, disabled
          inverse:   '#FFFFFF',   // white text on brand backgrounds
          brand:     '#C18B3C',   // brand-tinted text (links, price, active tab label)
          link:      '#C18B3C',   // clickable text links
        },

        // Status / semantic
        status: {
          // Order & user statuses
          pending:   { bg: '#FEF3C7', text: '#D97706', border: '#FDE68A' },
          active:    { bg: '#DCFCE7', text: '#16A34A', border: '#BBF7D0' },
          delivered: { bg: '#DCFCE7', text: '#16A34A', border: '#BBF7D0' },
          cancelled: { bg: '#FEE2E2', text: '#DC2626', border: '#FECACA' },
          preparing: { bg: '#FEF3C7', text: '#D97706', border: '#FDE68A' },
          onway:     { bg: '#DBEAFE', text: '#2563EB', border: '#BFDBFE' },
          paid:      { bg: '#DCFCE7', text: '#16A34A', border: '#BBF7D0' },
          blocked:   { bg: '#FEE2E2', text: '#DC2626', border: '#FECACA' },
          student:   { bg: '#EDE9FE', text: '#7C3AED', border: '#DDD6FE' },
          hot:       { bg: '#FEE2E2', text: '#EF4444', border: '#FECACA' },
        },

        // Semantic utility aliases
        success: {
          50:  '#F0FDF4',
          100: '#DCFCE7',
          500: '#22C55E',
          600: '#16A34A',
          700: '#15803D',
        },
        warning: {
          50:  '#FFFBEB',
          100: '#FEF3C7',
          500: '#F59E0B',
          600: '#D97706',
          700: '#B45309',
        },
        error: {
          50:  '#FFF1F2',
          100: '#FEE2E2',
          500: '#EF4444',
          600: '#DC2626',
          700: '#B91C1C',
        },
        info: {
          50:  '#EFF6FF',
          100: '#DBEAFE',
          500: '#3B82F6',
          600: '#2563EB',
        },
        purple: {
          50:  '#F5F3FF',
          100: '#EDE9FE',
          500: '#8B5CF6',
          600: '#7C3AED',
        },
      },

      // ── TYPOGRAPHY ───────────────────────────────────────────────────────────
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },

      fontSize: {
        // Mobile-first scale matching Figma
        '2xs': ['10px', { lineHeight: '14px', letterSpacing: '0.02em' }],
        xs:    ['12px', { lineHeight: '16px', letterSpacing: '0.01em' }],
        sm:    ['13px', { lineHeight: '20px' }],
        base:  ['14px', { lineHeight: '22px' }],
        md:    ['15px', { lineHeight: '24px' }],
        lg:    ['16px', { lineHeight: '26px' }],
        xl:    ['18px', { lineHeight: '28px' }],
        '2xl': ['20px', { lineHeight: '30px' }],
        '3xl': ['24px', { lineHeight: '32px' }],
        '4xl': ['28px', { lineHeight: '36px' }],
        '5xl': ['32px', { lineHeight: '40px' }],
        '6xl': ['36px', { lineHeight: '44px' }],
        '7xl': ['48px', { lineHeight: '56px' }],
      },

      fontWeight: {
        light:    '300',
        normal:   '400',
        medium:   '500',
        semibold: '600',
        bold:     '700',
        extrabold:'800',
      },

      letterSpacing: {
        label: '0.06em',   // used for ALL-CAPS micro-labels (NAME, PHONE, etc.)
        tight: '-0.01em',  // large headings
        normal: '0',
        wide:  '0.02em',
      },

      // ── BORDER RADIUS ────────────────────────────────────────────────────────
      borderRadius: {
        none:  '0',
        xs:    '4px',
        sm:    '6px',
        md:    '8px',       // inputs, small cards, table cells
        lg:    '10px',
        xl:    '12px',      // cards, modals (mobile), inner containers
        '2xl': '16px',      // main cards, restaurant cards, checkout cards
        '3xl': '20px',
        '4xl': '24px',      // large modal containers
        full:  '9999px',    // pill buttons, category chips, status badges
      },

      // ── SHADOWS ──────────────────────────────────────────────────────────────
      boxShadow: {
        // Card shadow — warm tone to match beige theme
        card:   '0 2px 8px rgba(193, 139, 60, 0.08), 0 0 1px rgba(0,0,0,0.06)',
        // Elevated card (restaurant cards, order cards)
        lift:   '0 4px 16px rgba(193, 139, 60, 0.12), 0 1px 4px rgba(0,0,0,0.06)',
        // Modal / bottom sheet
        modal:  '0 8px 40px rgba(0, 0, 0, 0.16), 0 2px 8px rgba(0,0,0,0.08)',
        // Sidebar (web)
        sidebar:'2px 0 12px rgba(0,0,0,0.06)',
        // Bottom nav (mobile)
        nav:    '0 -2px 12px rgba(0,0,0,0.06)',
        // Button glow on hover
        btn:    '0 4px 14px rgba(193, 139, 60, 0.35)',
        // Input focus ring
        focus:  '0 0 0 3px rgba(193, 139, 60, 0.20)',
        // Subtle — table rows, list items
        sm:     '0 1px 4px rgba(0,0,0,0.06)',
        // None
        none:   'none',
      },

      // ── SPACING ──────────────────────────────────────────────────────────────
      // Tastr uses a consistent 4px base grid
      spacing: {
        px:   '1px',
        0:    '0',
        0.5:  '2px',
        1:    '4px',
        1.5:  '6px',
        2:    '8px',
        2.5:  '10px',
        3:    '12px',
        3.5:  '14px',
        4:    '16px',
        5:    '20px',
        6:    '24px',
        7:    '28px',
        8:    '32px',
        9:    '36px',
        10:   '40px',
        11:   '44px',
        12:   '48px',
        14:   '56px',
        16:   '64px',
        18:   '72px',
        20:   '80px',
        24:   '96px',
        28:   '112px',
        32:   '128px',
        36:   '144px',
        40:   '160px',
        44:   '176px',
        48:   '192px',
        52:   '208px',
        56:   '224px',
        60:   '240px',
        64:   '256px',
        72:   '288px',
        80:   '320px',
        96:   '384px',
        // Layout-specific
        sidebar: '220px',   // admin sidebar width
        topbar:  '64px',    // web topbar height
        bottomnav: '72px',  // mobile bottom nav height
        topnav: '60px',     // mobile top nav height
      },

      // ── LAYOUT ───────────────────────────────────────────────────────────────
      maxWidth: {
        'content':  '1280px',   // max page content width (admin/restaurant web)
        'card-sm':  '320px',
        'card-md':  '480px',
        'card-lg':  '640px',
        'modal-sm': '400px',
        'modal-md': '600px',
        'modal-lg': '800px',
        'modal-xl': '960px',
      },

      width: {
        sidebar: '220px',
        'sidebar-collapsed': '64px',
      },

      height: {
        topbar:    '64px',
        bottomnav: '72px',
        topnav:    '60px',
      },

      // ── TRANSITIONS ──────────────────────────────────────────────────────────
      transitionDuration: {
        fast:   '150ms',
        base:   '200ms',
        slow:   '300ms',
        slower: '500ms',
      },

      transitionTimingFunction: {
        smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
        bounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        in:     'cubic-bezier(0.4, 0, 1, 1)',
        out:    'cubic-bezier(0, 0, 0.2, 1)',
      },

      // ── ANIMATION ────────────────────────────────────────────────────────────
      animation: {
        'fade-in':      'fadeIn 200ms ease-out',
        'fade-up':      'fadeUp 250ms ease-out',
        'slide-up':     'slideUp 300ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        'slide-in-r':   'slideInRight 300ms ease-out',
        'slide-in-l':   'slideInLeft 300ms ease-out',
        'scale-in':     'scaleIn 200ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        'spin-slow':    'spin 2s linear infinite',
        'pulse-brand':  'pulseBrand 2s ease-in-out infinite',
        'bounce-dot':   'bounceDot 1.4s ease-in-out infinite',
        'shimmer':      'shimmer 1.6s ease-in-out infinite',
      },

      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          from: { transform: 'translateY(100%)' },
          to:   { transform: 'translateY(0)' },
        },
        slideInRight: {
          from: { transform: 'translateX(100%)' },
          to:   { transform: 'translateX(0)' },
        },
        slideInLeft: {
          from: { transform: 'translateX(-100%)' },
          to:   { transform: 'translateX(0)' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.92)' },
          to:   { opacity: '1', transform: 'scale(1)' },
        },
        pulseBrand: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.5' },
        },
        bounceDot: {
          '0%, 80%, 100%': { transform: 'scale(0)' },
          '40%':           { transform: 'scale(1)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },

      // ── SCREENS (breakpoints) ────────────────────────────────────────────────
      // Mobile-first — keep mobile designs intact
      screens: {
        xs:  '375px',
        sm:  '640px',
        md:  '768px',
        lg:  '1024px',
        xl:  '1280px',
        '2xl':'1536px',
      },

      // ── Z-INDEX SCALE ────────────────────────────────────────────────────────
      zIndex: {
        0:          '0',
        10:         '10',    // cards
        20:         '20',    // sticky elements
        30:         '30',    // dropdowns, popovers
        40:         '40',    // bottom nav, top nav
        50:         '50',    // sidebar overlay (mobile)
        modal:      '100',   // modals, drawers
        toast:      '200',   // toast notifications
        tooltip:    '150',   // tooltips
      },

      // ── OPACITY ──────────────────────────────────────────────────────────────
      opacity: {
        0:    '0',
        5:    '0.05',
        10:   '0.10',
        20:   '0.20',
        30:   '0.30',
        40:   '0.40',
        50:   '0.50',
        60:   '0.60',
        70:   '0.70',
        80:   '0.80',
        90:   '0.90',
        95:   '0.95',
        100:  '1',
        disabled: '0.45',
      },
    },
  },

  plugins: [
    // Custom plugin: adds .tastr-* utility variants
    function({ addUtilities, addComponents, theme }) {

      // ── Scrollbar hiding ────────────────────────────────────────────────
      addUtilities({
        '.scrollbar-none': {
          '-ms-overflow-style': 'none',
          'scrollbar-width': 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        },
        '.scrollbar-thin': {
          'scrollbar-width': 'thin',
          'scrollbar-color': `${theme('colors.brand.200')} transparent`,
        },
      });

      // ── Safe area padding (mobile PWA) ──────────────────────────────────
      addUtilities({
        '.pb-safe': { paddingBottom: 'env(safe-area-inset-bottom)' },
        '.pt-safe': { paddingTop:    'env(safe-area-inset-top)' },
        '.pl-safe': { paddingLeft:   'env(safe-area-inset-left)' },
        '.pr-safe': { paddingRight:  'env(safe-area-inset-right)' },
      });

      // ── Skeleton shimmer gradient ────────────────────────────────────────
      addUtilities({
        '.skeleton': {
          background: `linear-gradient(
            90deg,
            ${theme('colors.bg.section')} 25%,
            ${theme('colors.bg.app')} 50%,
            ${theme('colors.bg.section')} 75%
          )`,
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.6s ease-in-out infinite',
        },
      });

      // ── Micro-label style (seen throughout Figma: NAME, PHONE, EMAIL caps) ──
      addUtilities({
        '.label-micro': {
          fontSize: '10px',
          fontWeight: '600',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: theme('colors.text.muted'),
        },
      });

      // ── Text truncate single line ────────────────────────────────────────
      addUtilities({
        '.truncate-2': {
          display: '-webkit-box',
          '-webkit-line-clamp': '2',
          '-webkit-box-orient': 'vertical',
          overflow: 'hidden',
        },
        '.truncate-3': {
          display: '-webkit-box',
          '-webkit-line-clamp': '3',
          '-webkit-box-orient': 'vertical',
          overflow: 'hidden',
        },
      });

      // ── Pre-composed component classes ──────────────────────────────────
      addComponents({

        // Primary pill button (golden — used for all primary CTAs)
        '.btn-primary': {
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          paddingTop: '14px',
          paddingBottom: '14px',
          paddingLeft: '28px',
          paddingRight: '28px',
          backgroundColor: theme('colors.brand.500'),
          color: '#FFFFFF',
          fontSize: '15px',
          fontWeight: '600',
          borderRadius: '9999px',
          border: 'none',
          cursor: 'pointer',
          transition: 'all 200ms ease',
          boxShadow: '0 4px 14px rgba(193, 139, 60, 0.35)',
          '&:hover': {
            backgroundColor: theme('colors.brand.600'),
            transform: 'translateY(-1px)',
          },
          '&:active': {
            backgroundColor: theme('colors.brand.700'),
            transform: 'translateY(0)',
          },
          '&:disabled': {
            opacity: '0.45',
            cursor: 'not-allowed',
            transform: 'none',
          },
        },

        // Secondary outlined button
        '.btn-secondary': {
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          paddingTop: '13px',
          paddingBottom: '13px',
          paddingLeft: '28px',
          paddingRight: '28px',
          backgroundColor: 'transparent',
          color: theme('colors.brand.500'),
          fontSize: '15px',
          fontWeight: '600',
          borderRadius: '9999px',
          border: `1.5px solid ${theme('colors.brand.500')}`,
          cursor: 'pointer',
          transition: 'all 200ms ease',
          '&:hover': {
            backgroundColor: theme('colors.brand.50'),
          },
          '&:active': {
            backgroundColor: theme('colors.brand.100'),
          },
          '&:disabled': {
            opacity: '0.45',
            cursor: 'not-allowed',
          },
        },

        // Ghost / text button
        '.btn-ghost': {
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          padding: '8px 12px',
          backgroundColor: 'transparent',
          color: theme('colors.brand.500'),
          fontSize: '14px',
          fontWeight: '600',
          borderRadius: '8px',
          border: 'none',
          cursor: 'pointer',
          transition: 'all 150ms ease',
          '&:hover': { backgroundColor: theme('colors.brand.50') },
        },

        // Danger button
        '.btn-danger': {
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          paddingTop: '14px',
          paddingBottom: '14px',
          paddingLeft: '28px',
          paddingRight: '28px',
          backgroundColor: theme('colors.error.600'),
          color: '#FFFFFF',
          fontSize: '15px',
          fontWeight: '600',
          borderRadius: '9999px',
          border: 'none',
          cursor: 'pointer',
          transition: 'background 200ms ease',
          '&:hover': { backgroundColor: theme('colors.error.700') },
        },

        // Standard card
        '.card': {
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          border: `1px solid ${theme('colors.border.DEFAULT')}`,
          boxShadow: '0 2px 8px rgba(193, 139, 60, 0.08), 0 0 1px rgba(0,0,0,0.06)',
          overflow: 'hidden',
        },

        // Standard input
        '.input': {
          width: '100%',
          padding: '12px 16px',
          fontSize: '14px',
          color: theme('colors.text.primary'),
          backgroundColor: theme('colors.bg.input'),
          border: `1px solid ${theme('colors.border.DEFAULT')}`,
          borderRadius: '10px',
          outline: 'none',
          transition: 'border-color 200ms ease, box-shadow 200ms ease',
          '&::placeholder': { color: theme('colors.text.muted') },
          '&:focus': {
            borderColor: theme('colors.brand.500'),
            boxShadow: '0 0 0 3px rgba(193, 139, 60, 0.20)',
          },
          '&:disabled': {
            opacity: '0.5',
            cursor: 'not-allowed',
            backgroundColor: theme('colors.bg.section'),
          },
        },

        // Admin data table
        '.tastr-table': {
          width: '100%',
          borderCollapse: 'separate',
          borderSpacing: '0',
          '& thead th': {
            backgroundColor: theme('colors.brand.500'),
            color: '#FFFFFF',
            fontSize: '13px',
            fontWeight: '600',
            padding: '12px 16px',
            textAlign: 'left',
            '&:first-child': { borderTopLeftRadius: '10px' },
            '&:last-child':  { borderTopRightRadius: '10px' },
          },
          '& tbody tr': {
            borderBottom: `1px solid ${theme('colors.border.light')}`,
            transition: 'background 150ms ease',
            '&:hover': { backgroundColor: theme('colors.brand.50') },
          },
          '& tbody td': {
            padding: '12px 16px',
            fontSize: '13px',
            color: theme('colors.text.primary'),
            verticalAlign: 'middle',
          },
        },

        // Status badge (pending, active, cancelled etc.)
        '.badge': {
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '3px 10px',
          borderRadius: '9999px',
          fontSize: '11px',
          fontWeight: '600',
        },
        '.badge-pending':   { backgroundColor: '#FEF3C7', color: '#D97706' },
        '.badge-active':    { backgroundColor: '#DCFCE7', color: '#16A34A' },
        '.badge-delivered': { backgroundColor: '#DCFCE7', color: '#16A34A' },
        '.badge-cancelled': { backgroundColor: '#FEE2E2', color: '#DC2626' },
        '.badge-onway':     { backgroundColor: '#DBEAFE', color: '#2563EB' },
        '.badge-preparing': { backgroundColor: '#FEF3C7', color: '#D97706' },
        '.badge-hot':       { backgroundColor: '#FEE2E2', color: '#EF4444' },
        '.badge-student':   { backgroundColor: '#EDE9FE', color: '#7C3AED' },

        // Category chip (horizontal scroll filter row)
        '.chip': {
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 18px',
          borderRadius: '9999px',
          fontSize: '13px',
          fontWeight: '500',
          border: `1.5px solid ${theme('colors.border.DEFAULT')}`,
          backgroundColor: '#FFFFFF',
          color: theme('colors.text.secondary'),
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          transition: 'all 150ms ease',
          '&:hover': {
            borderColor: theme('colors.brand.500'),
            color: theme('colors.brand.500'),
          },
          '&.active': {
            backgroundColor: theme('colors.brand.500'),
            borderColor: theme('colors.brand.500'),
            color: '#FFFFFF',
            fontWeight: '600',
          },
        },

        // Section header row (label + "See all •")
        '.section-header': {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '12px',
          '& h2': {
            fontSize: '18px',
            fontWeight: '700',
            color: theme('colors.text.primary'),
          },
          '& a, & button': {
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '13px',
            fontWeight: '500',
            color: theme('colors.brand.500'),
          },
        },

        // Sidebar nav item (web admin / restaurant)
        '.nav-item': {
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '10px 14px',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: '500',
          color: theme('colors.text.secondary'),
          cursor: 'pointer',
          transition: 'all 150ms ease',
          '&:hover': {
            backgroundColor: theme('colors.brand.50'),
            color: theme('colors.brand.500'),
          },
          '&.active': {
            backgroundColor: theme('colors.brand.100'),
            color: theme('colors.brand.600'),
            fontWeight: '600',
          },
        },

        // Mobile bottom nav tab
        '.bottom-tab': {
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '3px',
          flex: '1',
          paddingTop: '8px',
          paddingBottom: '8px',
          color: theme('colors.text.muted'),
          '& span': { fontSize: '10px', fontWeight: '500' },
          '&.active': {
            color: theme('colors.brand.500'),
            '& span': { fontWeight: '600' },
          },
        },

        // Price text
        '.price': {
          fontSize: '16px',
          fontWeight: '700',
          color: theme('colors.brand.500'),
        },
        '.price-lg': {
          fontSize: '24px',
          fontWeight: '700',
          color: theme('colors.brand.500'),
        },

        // Rating star row
        '.rating': {
          display: 'inline-flex',
          alignItems: 'center',
          gap: '3px',
          '& .star': { color: '#F59E0B', fontSize: '12px' },
          '& .score': {
            fontSize: '12px',
            fontWeight: '600',
            color: theme('colors.text.primary'),
          },
        },

        // Page container (web — accounts for sidebar)
        '.page-with-sidebar': {
          marginLeft: '220px',
          minHeight: '100vh',
          backgroundColor: theme('colors.bg.page'),
          padding: '24px',
        },

        // Mobile page wrapper
        '.mobile-page': {
          backgroundColor: theme('colors.bg.app'),
          minHeight: '100vh',
          paddingTop: '60px',    // below top nav
          paddingBottom: '72px', // above bottom nav
        },
      });
    },
  ],
};
