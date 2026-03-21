import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronDown, Phone, MessageCircle, HelpCircle } from 'lucide-react'
import MainLayout from '../../layouts/MainLayout.jsx'
import api from '../../services/api.js'

const DEFAULT_FAQ_SECTIONS = [
  {
    title: 'Orders & Delivery',
    icon: '📦',
    faqs: [
      { q: 'How long does delivery take?', a: 'Estimated delivery times are shown on the restaurant page. Most orders arrive in 25–45 minutes depending on distance and restaurant preparation time.' },
      { q: 'Can I track my order?', a: 'Yes! Once your order is confirmed you can track your driver in real-time from the Orders tab. You\'ll receive push notifications at every stage.' },
      { q: 'What if my order is late?', a: 'If your order is significantly delayed, you\'ll be notified automatically. You can also contact support via the chat button below and we\'ll investigate immediately.' },
      { q: 'Can I cancel my order?', a: 'Orders can be cancelled within 2 minutes of placing. After that, the restaurant has started preparing and cancellations may not be possible. Contact support for help.' },
    ],
  },
  {
    title: 'Refunds & Issues',
    icon: '💸',
    faqs: [
      { q: 'My order was wrong — what do I do?', a: 'Go to Orders, select the order, tap "Report an Issue". Upload a photo if possible. We\'ll review within 24 hours and issue a refund or credit to your wallet.' },
      { q: 'How long do refunds take?', a: 'Wallet credits are instant. Card refunds typically take 3–5 business days depending on your bank.' },
      { q: 'Can I get a refund on a subscription?', a: 'Subscriptions can be cancelled anytime. Refunds are available within 24 hours of renewal if unused. Contact support for help.' },
    ],
  },
  {
    title: 'Account & Payment',
    icon: '💳',
    faqs: [
      { q: 'How do I add a payment method?', a: 'Go to Checkout and tap "Add Card". We accept all major debit and credit cards via Stripe. Your card details are stored securely — we never see your full card number.' },
      { q: 'What is the Tastr Wallet?', a: 'Your Tastr Wallet lets you top up with GBP and pay quickly at checkout. Wallet funds never expire and can be used alongside promo codes.' },
      { q: 'How do I change my password?', a: 'Go to Profile → Account Settings → Change Password. You\'ll need your current password to set a new one.' },
      { q: 'How do I delete my account?', a: 'Account deletion is available in Profile → Account Settings → Delete Account. This is permanent and cannot be undone.' },
    ],
  },
  {
    title: 'Tastr+ Subscription',
    icon: '👑',
    faqs: [
      { q: 'What is Tastr+?', a: 'Tastr+ is our premium membership. It gives you free delivery from participating restaurants, exclusive offers, and student discounts when combined with student verification.' },
      { q: 'How do I sign up for Tastr+?', a: 'Go to Profile → Subscriptions. You can choose monthly or annual billing. Cancel anytime with no penalties.' },
      { q: 'Which restaurants offer free Tastr+ delivery?', a: 'Look for the 👑 crown icon on restaurant listings. The number of participating restaurants grows every week.' },
    ],
  },
]

function AccordionItem({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-border last:border-0">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between py-4 text-left gap-3">
        <span className="text-sm font-medium text-text-primary">{q}</span>
        <ChevronDown size={16} className={`text-text-muted flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <p className="text-sm text-text-muted pb-4 leading-relaxed">{a}</p>
      )}
    </div>
  )
}

export default function HelpPage() {
  const navigate = useNavigate()
  const [activeSection, setActiveSection] = useState(null)
  const [faqSections, setFaqSections] = useState(DEFAULT_FAQ_SECTIONS)

  useEffect(() => {
    api.get('/users/cms/help-faqs')
      .then(res => {
        try {
          const parsed = JSON.parse(res.data.page?.content || '[]')
          if (Array.isArray(parsed) && parsed.length > 0) setFaqSections(parsed)
        } catch { /* use defaults */ }
      })
      .catch(() => { /* use defaults */ })
  }, [])

  return (
    <MainLayout>
      <div className="max-w-lg mx-auto pb-8">
        {/* Header */}
        <div className="bg-brand-500 px-5 pt-10 pb-8 rounded-b-3xl text-white mb-6">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-white/80 mb-4 text-sm">
            <ChevronLeft size={18} /> Back
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
              <HelpCircle size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Help & Support</h1>
              <p className="text-white/80 text-xs">How can we help you today?</p>
            </div>
          </div>
        </div>

        <div className="px-5 space-y-5">
          {/* Contact Options */}
          <div className="grid grid-cols-2 gap-3">
            <a href="tel:+448001234567"
              className="flex items-center gap-3 bg-bg-card border border-border rounded-2xl p-4 hover:border-brand-400 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center flex-shrink-0">
                <Phone size={18} className="text-brand-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-text-primary">Make a call</p>
                <p className="text-xs text-text-muted">0800 123 4567</p>
              </div>
            </a>
            <button
              onClick={() => navigate('/orders')}
              className="flex items-center gap-3 bg-bg-card border border-border rounded-2xl p-4 hover:border-brand-400 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
                <MessageCircle size={18} className="text-green-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-text-primary">Chat with us</p>
                <p className="text-xs text-text-muted">Avg. 2 min reply</p>
              </div>
            </button>
          </div>

          {/* FAQ Sections */}
          <div>
            <h2 className="text-sm font-bold text-text-primary mb-3">Frequently Asked Questions</h2>
            <div className="space-y-3">
              {faqSections.map((section, i) => (
                <div key={i} className="bg-bg-card border border-border rounded-2xl overflow-hidden">
                  <button
                    onClick={() => setActiveSection(activeSection === i ? null : i)}
                    className="w-full flex items-center justify-between px-5 py-4">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{section.icon}</span>
                      <span className="text-sm font-bold text-text-primary">{section.title}</span>
                    </div>
                    <ChevronDown size={16} className={`text-text-muted transition-transform ${activeSection === i ? 'rotate-180' : ''}`} />
                  </button>
                  {activeSection === i && (
                    <div className="px-5 pb-2">
                      {section.faqs.map((faq, j) => (
                        <AccordionItem key={j} q={faq.q} a={faq.a} />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
