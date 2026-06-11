import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import './Pricing.css';

export default function Pricing() {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const [currentPlan, setCurrentPlan] = useState('free');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/user_api.php?action=get_profile')
      .then(res => res.json())
      .then(data => {
        if (data.ok && data.user) {
          setCurrentPlan(data.user.plan_type);
        }
      })
      .catch(console.error);
  }, []);

  const handleUpgrade = async (planType) => {
    setLoading(true);
    try {
      const res = await fetch('/user_api.php?action=upgrade_plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planType })
      });
      const data = await res.json();
      if (data.ok) {
        setCurrentPlan(data.plan_type);
        alert(`Successfully upgraded to ${planType.toUpperCase()} plan!`);
      } else {
        alert(data.error || 'Failed to upgrade plan');
      }
    } catch (err) {
      console.error(err);
      alert('Network error');
    }
    setLoading(false);
  };

  const plans = {
    am: [
      { id: 'free', name: 'Անվճար', price: '$0', period: 'ընդմիշտ', desc: 'Իդեալական է սկսելու համար:', color: '#A0A0B0', features: ['✓ Ավելի քան 500 ակորդներ', '✓ Ստեղծիր մինչև 3 երգացանկ', '✓ 1 թիմի անդամ', '✓ Պարզ տրանսպոզիցիա', '✗ Թիմային համագործակցություն', '✗ Անսահմանափակ երգացանկեր', '✗ Վիճակագրություն'], cta: 'Սկսել Անվճար', highlight: false },
      { id: 'pro', name: 'Պրո', price: '$9', period: 'ամսական', desc: 'Ակտիվ պաշտամունքային թիմերի համար:', color: '#00F0FF', features: ['✓ Անսահմանափակ ակորդներ', '✓ Անսահմանափակ երգացանկեր', '✓ Մինչև 10 թիմի անդամ', '✓ Ընդլայնված տրանսպոզիցիա', '✓ Թիմային համագործակցություն', '✓ Փորձերի պլանավորում', '✗ Սեփական բրենդինգ'], cta: 'Սկսել Պրո Փորձաշրջան', highlight: true },
      { id: 'church', name: 'Եկեղեցի', price: '$29', period: 'ամսական', desc: 'Մեծ եկեղեցիների համար:', color: '#9D72FF', features: ['✓ Ամեն ինչ Պրո փաթեթում', '✓ Անսահմանափակ թիմի անդամներ', '✓ Մի քանի պաշտամունքային թիմեր', '✓ Ընդլայնված վիճակագրություն', '✓ Սեփական բրենդինգ', '✓ Առաջնահերթ աջակցություն', '✓ API հասանելիություն'], cta: 'Կապվել Վաճառքի Բաժնի Հետ', highlight: false }
    ],
    en: [
      { id: 'free', name: 'Free', price: '$0', period: 'forever', desc: 'Perfect for getting started.', color: '#A0A0B0', features: ['✓ Access 500+ chord charts', '✓ Create up to 3 setlists', '✓ 1 team member', '✓ Basic transposition', '✗ Team collaboration', '✗ Unlimited setlists', '✗ Advanced analytics'], cta: 'Get Started Free', highlight: false },
      { id: 'pro', name: 'Pro', price: '$9', period: 'per month', desc: 'For active worship teams.', color: '#00F0FF', features: ['✓ Unlimited chord charts', '✓ Unlimited setlists', '✓ Up to 10 team members', '✓ Advanced transposition', '✓ Team collaboration', '✓ Rehearsal scheduling', '✗ Custom branding'], cta: 'Start Pro Trial', highlight: true },
      { id: 'church', name: 'Church', price: '$29', period: 'per month', desc: 'For large churches & ministries.', color: '#9D72FF', features: ['✓ Everything in Pro', '✓ Unlimited team members', '✓ Multiple worship teams', '✓ Advanced analytics', '✓ Custom branding', '✓ Priority support', '✓ API access'], cta: 'Contact Sales', highlight: false }
    ],
    ru: [
      { id: 'free', name: 'Бесплатно', price: '$0', period: 'навсегда', desc: 'Идеально для начала.', color: '#A0A0B0', features: ['✓ Доступ к 500+ аккордам', '✓ До 3 сет-листов', '✓ 1 член команды', '✓ Базовая транспозиция', '✗ Командная работа', '✗ Безлимитные сет-листы', '✗ Аналитика'], cta: 'Начать Бесплатно', highlight: false },
      { id: 'pro', name: 'Про', price: '$9', period: 'в месяц', desc: 'Для активных команд поклонения.', color: '#00F0FF', features: ['✓ Безлимитные аккорды', '✓ Безлимитные сет-листы', '✓ До 10 членов команды', '✓ Продвинутая транспозиция', '✓ Командная работа', '✓ Планирование репетиций', '✗ Свой брендинг'], cta: 'Начать Про Период', highlight: true },
      { id: 'church', name: 'Церковь', price: '$29', period: 'в месяц', desc: 'Для больших церквей.', color: '#9D72FF', features: ['✓ Всё из Про', '✓ Безлимитные члены команды', '✓ Несколько команд поклонения', '✓ Продвинутая аналитика', '✓ Свой брендинг', '✓ Приоритетная поддержка', '✓ Доступ к API'], cta: 'Связаться с Отделом Продаж', highlight: false }
    ]
  }[language] || [];

  const currentPlans = plans.length > 0 ? plans : plans.en;

  const faqs = {
    am: [
      { q: 'Կարո՞ղ եմ փոխել փաթեթը ավելի ուշ:', a: 'Այո՛, Դուք կարող եք փոխել Ձեր փաթեթը ցանկացած ժամանակ: Փոփոխություններն ուժի մեջ կմտնեն անմիջապես:' },
      { q: 'Կա՞ արդյոք անվճար փորձաշրջան:', a: 'Պրո փաթեթն ունի 14-օրյա անվճար փորձաշրջան: Սկսելու համար բանկային քարտ չի պահանջվում:' },
      { q: 'Քանի՞ երգ կա գրադարանում:', a: 'Մենք ունենք ավելի քան 10,000 երգերի ակորդներ և ամեն շաբաթ ավելացնում ենք նորերը՝ ըստ համայնքի պահանջների:' },
      { q: 'Կարո՞ղ եմ արտահանել իմ տվյալները:', a: 'Այո: Դուք կարող եք արտահանել Ձեր երգացանկերը և ակորդները PDF ձևաչափով ցանկացած ժամանակ:' }
    ],
    en: [
      { q: 'Can I switch plans later?', a: 'Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately.' },
      { q: 'Is there a free trial?', a: 'The Pro plan comes with a 14-day free trial. No credit card required to start.' },
      { q: 'How many songs are in the library?', a: 'We have over 10,000 chord charts and add new songs weekly based on community requests.' },
      { q: 'Can I export my data?', a: 'Yes. You can export your setlists, chord charts, and team data at any time in PDF or CSV format.' }
    ],
    ru: [
      { q: 'Могу ли я сменить план позже?', a: 'Да! Вы можете изменить план в любое время. Изменения вступают в силу немедленно.' },
      { q: 'Есть ли бесплатный пробный период?', a: 'План Про включает 14-дневный бесплатный пробный период. Кредитная карта не требуется.' },
      { q: 'Сколько песен в библиотеке?', a: 'У нас более 10,000 аккордов, и мы добавляем новые песни еженедельно по запросам сообщества.' },
      { q: 'Могу ли я экспортировать свои данные?', a: 'Да. Вы можете экспортировать сет-листы и аккорды в формате PDF в любое время.' }
    ]
  }[language] || [];
  
  const currentFaqs = faqs.length > 0 ? faqs : faqs.en;

  return (
    <div className="pricing-page">
      <div className="pricing-header">
        <span className="pricing-badge">{t('pricing.badge')}</span>
        <h1>{t('pricing.title')}</h1>
        <p>{t('pricing.subtitle')}</p>
      </div>

      <div className="pricing-grid">
        {currentPlans.map((plan, i) => (
          <div key={i} className={`plan-card ${plan.highlight ? 'plan-card--highlight' : ''}`}>
            {plan.highlight && <div className="plan-popular-badge">{t('pricing.popular')}</div>}
            <div className="plan-header">
              <h2>{plan.name}</h2>
              <div className="plan-price">
                <span className="price-amount" style={{ color: plan.color }}>{plan.price}</span>
                <span className="price-period">/{plan.period}</span>
              </div>
              <p className="plan-desc">{plan.desc}</p>
            </div>
            <ul className="plan-features">
              {plan.features.map((f, j) => (
                <li key={j} className={f.startsWith('✗') ? 'plan-feature--disabled' : ''}>
                  {f}
                </li>
              ))}
            </ul>
            <button
              className={`plan-cta ${plan.highlight ? 'plan-cta--primary' : 'plan-cta--ghost'}`}
              style={plan.highlight ? { background: plan.color } : { borderColor: plan.color, color: plan.color }}
              onClick={() => handleUpgrade(plan.id)}
              disabled={loading || currentPlan === plan.id}
            >
              {currentPlan === plan.id ? 'Ընթացիկ (Current)' : plan.cta}
            </button>
          </div>
        ))}
      </div>

      <div className="pricing-faq">
        <div className="pricing-container">
          <h2>{t('pricing.faqTitle')}</h2>
          <div className="faq-grid">
            {currentFaqs.map((item, i) => (
              <div key={i} className="faq-item">
                <h4>{item.q}</h4>
                <p>{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
