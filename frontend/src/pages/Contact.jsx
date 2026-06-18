import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import './Contact.css';

export default function Contact() {
  const { t } = useLanguage();
  const [formData, setFormData] = React.useState({ name: '', email: '', message: '' });
  const [loading, setLoading] = React.useState(false);
  const [status, setStatus] = React.useState({ type: '', msg: '' });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ type: '', msg: '' });
    
    try {
      const res = await fetch('/contact_api.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      
      if (data.ok) {
        setStatus({ type: 'success', msg: 'Շնորհակալություն։ Ձեր հաղորդագրությունը ուղարկված է։' });
        setFormData({ name: '', email: '', message: '' });
      } else {
        setStatus({ type: 'error', msg: data.error || 'Սխալ տեղի ունեցավ: Խնդրում ենք փորձել կրկին:' });
      }
    } catch (err) {
      setStatus({ type: 'error', msg: 'Կապի խափանում: Խնդրում ենք ստուգել ինտերնետ կապը:' });
    }
    
    setLoading(false);
  };

  return (
    <div className="contact-page">
      <div className="contact-container">
        <div className="contact-header">
          <h1>{t('megaMenu.contacts')}</h1>
          <p>Ունե՞ք հարցեր, առաջարկներ կամ ցանկանում եք համագործակցել։ Գրեք մեզ, և մենք սիրով կպատասխանենք:</p>
        </div>
        
        <div className="contact-content">
          <div className="contact-info">
            <div className="info-card">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
              <h3>Էլ. հասցե</h3>
              <p>info@worship.pmstudio.am</p>
            </div>
            <div className="info-card">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
              <h3>Հեռախոս</h3>
              <p>+374 00 000000</p>
            </div>
          </div>

          <form className="contact-form" onSubmit={handleSubmit}>
            {status.msg && (
              <div style={{ padding: '12px', marginBottom: '16px', borderRadius: '8px', background: status.type === 'success' ? 'rgba(0,255,0,0.1)' : 'rgba(255,0,0,0.1)', color: status.type === 'success' ? '#4CAF50' : '#FF5252', fontSize: '14px' }}>
                {status.msg}
              </div>
            )}
            <div className="form-group">
              <label>Անուն</label>
              <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Ձեր անունը" required disabled={loading} />
            </div>
            <div className="form-group">
              <label>Էլ. հասցե</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="example@email.com" required disabled={loading} />
            </div>
            <div className="form-group">
              <label>Հաղորդագրություն</label>
              <textarea name="message" value={formData.message} onChange={handleChange} placeholder="Գրեք ձեր հարցը կամ առաջարկը այստեղ..." rows="5" required disabled={loading}></textarea>
            </div>
            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? 'Ուղարկվում է...' : 'Ուղարկել'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
