import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import './Contact.css';

export default function Contact() {
  const { t } = useLanguage();
  const { user } = useAuth();
  
  const [formData, setFormData] = useState({ 
    name: user?.name || '', 
    email: user?.email || '', 
    contact: user?.email || '',
    subject: 'question',
    message: '' 
  });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: '', msg: '' });

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        name: prev.name || user.name || '',
        email: prev.email || user.email || '',
        contact: prev.contact || user.email || user.name || ''
      }));
    }
  }, [user]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ type: '', msg: '' });

    const subjectMap = {
      question: '❓ Հարց կամ օգնություն',
      feature: '💡 Առաջարկություն',
      bug: '🛠 Սխալի մասին հայտնում (Bug report)',
      other: '💬 Այլ'
    };
    const formattedSubject = subjectMap[formData.subject] || formData.subject;
    
    try {
      const res = await fetch('/account_api.php?action=send_support_message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          contact: formData.contact,
          subject: formattedSubject,
          message: formData.message
        })
      });
      const data = await res.json();
      
      if (data.ok) {
        setStatus({ type: 'success', msg: data.message || t('contact.success', 'Ձեր հաղորդագրությունը հաջողությամբ ուղարկվեց։ Շնորհակալություն։') });
        setFormData(prev => ({ ...prev, message: '' }));
      } else {
        const fallbackRes = await fetch('/contact_api.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name,
            email: formData.email || formData.contact,
            message: `[${formattedSubject}] ${formData.message} (Contact: ${formData.contact})`
          })
        });
        const fallbackData = await fallbackRes.json();
        if (fallbackData.ok) {
          setStatus({ type: 'success', msg: t('contact.success', 'Ձեր հաղորդագրությունը հաջողությամբ ուղարկվեց։ Շնորհակալություն։') });
          setFormData(prev => ({ ...prev, message: '' }));
        } else {
          setStatus({ type: 'error', msg: data.error || fallbackData.error || t('contact.error', 'Սխալ է տեղի ունեցել։ Խնդրում ենք փորձել կրկին։') });
        }
      }
    } catch (err) {
      setStatus({ type: 'error', msg: t('contact.networkError', 'Ցանցային սխալ։ Խնդրում ենք ստուգել կապը։') });
    }
    
    setLoading(false);
  };

  return (
    <div className="contact-page">
      <div className="contact-hero">
        <div className="contact-hero-bg" />
        <div className="contact-hero-content">
          <span className="contact-badge">✨ {t('megaMenu.contacts', 'ԿԱՊ & ԱՋԱԿՑՈՒԹՅՈՒՆ')}</span>
          <h1>{t('contact.title', 'Մենք պատրաստ ենք աջակցել Ձեզ')}</h1>
          <p>{t('contact.intro', 'Ունե՞ք հարցեր, առաջարկներ կամ նկատե՞լ եք խնդիր: Կապ հաստատեք մեր Telegram բոտով, էլ. փոստով կամ ուղարկեք հաղորդագրություն։')}</p>
        </div>
      </div>

      <div className="contact-layout">
        {/* LEFT COLUMN: BENTO INFO CARDS */}
        <div className="contact-info-column">
          {/* Telegram Bot Card */}
          <a href="https://t.me/worship_platform_bot" target="_blank" rel="noopener noreferrer" className="contact-bento-card telegram-card">
            <div className="bento-icon telegram">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/></svg>
            </div>
            <div className="bento-body">
              <span className="bento-label">Telegram Բոտ</span>
              <strong>@worship_platform_bot</strong>
              <small>Արագ օնլայն աջակցություն Telegram-ում</small>
            </div>
          </a>

          {/* Email Card */}
          <a href="mailto:worship@pmstudio.am" className="contact-bento-card">
            <div className="bento-icon cyan">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
            </div>
            <div className="bento-body">
              <span className="bento-label">{t('contact.email', 'Էլ. փոստ (Email)')}</span>
              <strong>worship@pmstudio.am</strong>
              <small>{t('contact.emailDesc', 'Ուղարկեք մեզ նամակ ցանկացած ժամանակ')}</small>
            </div>
          </a>

          {/* Documentation Card */}
          <Link to="/documentation" className="contact-bento-card">
            <div className="bento-icon purple">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            </div>
            <div className="bento-body">
              <span className="bento-label">{t('contact.docs', 'Փաստաթղթեր & Ուղեցույցներ')}</span>
              <strong>worship.pmstudio.am/documentation</strong>
              <small>{t('contact.docsDesc', 'Ծրագրի օգտագործման ամբողջական ուղեցույց')}</small>
            </div>
          </Link>

          {/* Support / FAQ Card */}
          <Link to="/support" className="contact-bento-card">
            <div className="bento-icon gold">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
            </div>
            <div className="bento-body">
              <span className="bento-label">{t('contact.support', 'Աջակցության Կենտրոն')}</span>
              <strong>{t('contact.supportTitle', 'Հաճախ Տրվող Հարցեր (FAQ)')}</strong>
              <small>{t('contact.supportDesc', 'Գտեք արագ պատասխաններ Ձեր հարցերին')}</small>
            </div>
          </Link>

          {/* Office Card */}
          <div className="contact-bento-card static">
            <div className="bento-icon orange">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="10" r="3"></circle><path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 7 8 11.7z"></path></svg>
            </div>
            <div className="bento-body">
              <span className="bento-label">{t('contact.office', 'Գրասենյակ')}</span>
              <strong>{window.SITE_CONFIG?.contactAddress || 'Երևան, Հայաստան'}</strong>
              <small>{window.SITE_CONFIG?.contactPhone || '+374 00 000000'}</small>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: CONTACT FORM CARD */}
        <div className="contact-form-column">
          <form className="contact-form-card" onSubmit={handleSubmit}>
            <div className="form-card-header">
              <h2>{t('contact.sendMessageTitle', 'Ուղարկել Հաղորդագրություն')}</h2>
              <p>{t('contact.sendMessageDesc', 'Լրացրեք ձևանմուշը և մեր թիմը կպատասխանի հնարավորինս շուտ։')}</p>
            </div>

            {status.msg && (
              <div className={`contact-status-alert ${status.type === 'success' ? 'alert-success' : 'alert-error'}`}>
                {status.msg}
              </div>
            )}

            <div className="contact-form-grid">
              <div className="contact-field-group">
                <label>{t('contact.name', 'Անուն Ազգանուն')}</label>
                <input 
                  type="text" 
                  name="name" 
                  value={formData.name} 
                  onChange={handleChange} 
                  placeholder={t('contact.yourName', 'Ձեր անունը')} 
                  required 
                  disabled={loading} 
                />
              </div>

              <div className="contact-field-group">
                <label>{t('contact.email', 'Էլ. հասցե (Email)')}</label>
                <input 
                  type="email" 
                  name="email" 
                  value={formData.email} 
                  onChange={handleChange} 
                  placeholder="example@email.com" 
                  required 
                  disabled={loading} 
                />
              </div>
            </div>

            <div className="contact-form-grid">
              <div className="contact-field-group">
                <label>{t('support.topicLabel', 'Թեմա')}</label>
                <select name="subject" value={formData.subject} onChange={handleChange} disabled={loading}>
                  <option value="question">❓ Հարց կամ օգնություն</option>
                  <option value="feature">💡 Առաջարկություն</option>
                  <option value="bug">🛠 Սխալի մասին հայտնում (Bug report)</option>
                  <option value="other">💬 Այլ</option>
                </select>
              </div>

              <div className="contact-field-group">
                <label>{t('support.contactLabel', 'Ձեր կոնտակտը (Telegram / Email / Հեռախոս)')}</label>
                <input 
                  type="text" 
                  name="contact" 
                  value={formData.contact} 
                  onChange={handleChange} 
                  placeholder="@username, email..." 
                  disabled={loading} 
                />
              </div>
            </div>

            <div className="contact-field-group">
              <label>{t('contact.message', 'Հաղորդագրություն')}</label>
              <textarea 
                name="message" 
                value={formData.message} 
                onChange={handleChange} 
                placeholder={t('support.messagePlaceholder', 'Նկարագրեք Ձեր հարցը կամ առաջարկությունը...')} 
                rows="5" 
                required 
                disabled={loading} 
              />
            </div>

            <button type="submit" className="contact-submit-btn" disabled={loading}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
              <span>{loading ? t('contact.submitting', 'Ուղարկվում է...') : t('contact.submit', 'Ուղարկել Հաղորդագրությունը')}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
