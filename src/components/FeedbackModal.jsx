import React, { useState, useEffect } from 'react';
import { useProject } from '../context/ProjectContext';
import './FeedbackModal.css';

function FeedbackModal({ isOpen, onClose }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    profession: '',
    rating: 0,
    smoothness: '',
    detection: '',
    issues: [],
    otherIssue: '',
    feedback: '',
    attachments: []
  });
  const [consent, setConsent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    const otherText = document.getElementById('other-issue-text');
    if (otherText) {
      otherText.style.display = formData.issues.includes('other') ? 'block' : 'none';
    }
  }, [formData.issues]);

  useEffect(() => {
    const consentGroup = document.getElementById('consent-group');
    if (consentGroup) {
      consentGroup.style.display = formData.attachments.length > 0 ? 'block' : 'none';
    }
  }, [formData.attachments]);

  if (!isOpen) return null;

  const handleStarClick = (value) => {
    setFormData({ ...formData, rating: value });
  };

  const handleCheckboxChange = (e) => {
    const { value, checked } = e.target;
    setFormData({
      ...formData,
      issues: checked
        ? [...formData.issues, value]
        : formData.issues.filter(i => i !== value)
    });
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setFormData({ ...formData, attachments: files });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.attachments.length > 0 && !consent) {
      alert('Please consent to share files');
      return;
    }
    setIsSubmitting(true);

    const GOOGLE_SHEET_URL = 'https://script.google.com/macros/s/AKfycbyzdckrpKE7syBeIAtCbRF5iLStQ3CB2Q-nO3ey6gwSaT97H_grtp8GV3N6v_26VtuB3A/exec';

    try {
      const submitData = {
        name: formData.name,
        email: formData.email,
        profession: formData.profession,
        rating: formData.rating,
        smoothness: formData.smoothness,
        detection: formData.detection,
        issues: formData.issues.join(', '),
        otherIssue: formData.otherIssue,
        feedback: formData.feedback,
        timestamp: new Date().toISOString()
      };

      await fetch(GOOGLE_SHEET_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData)
      });

      setIsSubmitting(false);
      setIsSuccess(true);
      setTimeout(() => {
        onClose();
        setIsSuccess(false);
        setFormData({
          name: '',
          email: '',
          profession: '',
          rating: 0,
          smoothness: '',
          detection: '',
          issues: [],
          otherIssue: '',
          feedback: '',
          attachments: []
        });
        setConsent(false);
      }, 2000);
    } catch (error) {
      alert('Failed to submit feedback. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="feedback-modal-overlay" onClick={onClose}>
      <div className="feedback-modal" onClick={(e) => e.stopPropagation()}>
        {isSuccess ? (
          <div className="feedback-success">
            <div className="success-icon">✓</div>
            <p>Thank you for your feedback!</p>
          </div>
        ) : (
          <>
            <div className="feedback-header">
              <h3>Share Your Feedback</h3>
              <button className="close-btn" onClick={onClose}>×</button>
            </div>
            <form className="feedback-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Name</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="Your name" required />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} placeholder="your@email.com" required />
              </div>
              <div className="form-group">
                <label>Profession</label>
                <select value={formData.profession} onChange={(e) => setFormData({...formData, profession: e.target.value})} required>
                  <option value="">Select...</option>
                  <option value="student">Student</option>
                  <option value="developer">Developer</option>
                  <option value="devops">DevOps</option>
                  <option value="instructor">Instructor</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="form-group">
                <label>How'd it go?</label>
                <div className="star-rating">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button key={star} type="button" className={`star ${star <= formData.rating ? 'active' : ''}`} onClick={() => handleStarClick(star)}>★</button>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label>Setup smoothness</label>
                <div className="radio-group">
                  <label className="radio-label"><input type="radio" name="smoothness" value="yes" onChange={(e) => setFormData({...formData, smoothness: e.target.value})} /><span>Yes</span></label>
                  <label className="radio-label"><input type="radio" name="smoothness" value="no" onChange={(e) => setFormData({...formData, smoothness: e.target.value})} /><span>No</span></label>
                </div>
              </div>
              <div className="form-group">
                <label>Project detection accuracy</label>
                <div className="radio-group">
                  <label className="radio-label"><input type="radio" name="detection" value="yes" onChange={(e) => setFormData({...formData, detection: e.target.value})} /><span>Yes</span></label>
                  <label className="radio-label"><input type="radio" name="detection" value="no" onChange={(e) => setFormData({...formData, detection: e.target.value})} /><span>No</span></label>
                  <label className="radio-label"><input type="radio" name="detection" value="partially" onChange={(e) => setFormData({...formData, detection: e.target.value})} /><span>Partially</span></label>
                </div>
              </div>
              <div className="form-group">
                <label>What issues did you face? (optional)</label>
                <div className="checkbox-group">
                  <label className="checkbox-label"><input type="checkbox" value="dep-failed" onChange={handleCheckboxChange} /><span>Dependency install failed</span></label>
                  <label className="checkbox-label"><input type="checkbox" value="env-missing" onChange={handleCheckboxChange} /><span>Env variables missing</span></label>
                  <label className="checkbox-label"><input type="checkbox" value="port-conflict" onChange={handleCheckboxChange} /><span>Port conflict</span></label>
                  <label className="checkbox-label"><input type="checkbox" value="docker-issues" onChange={handleCheckboxChange} /><span>Docker compose issues</span></label>
                  <label className="checkbox-label"><input type="checkbox" value="ai-confusing" onChange={handleCheckboxChange} /><span>AI guidance confusing</span></label>
                  <label className="checkbox-label"><input type="checkbox" value="ui-bug" onChange={handleCheckboxChange} /><span>UI bug</span></label>
                  <label className="checkbox-label"><input type="checkbox" value="other" id="issue-other" onChange={handleCheckboxChange} /><span>Other</span></label>
                </div>
                <input type="text" id="other-issue-text" value={formData.otherIssue} onChange={(e) => setFormData({...formData, otherIssue: e.target.value})} placeholder="Please specify..." style={{display: 'none', marginTop: '8px'}} />
              </div>
              <div className="form-group">
                <label>Attach screenshots or logs (optional)</label>
                <input type="file" id="file-input" multiple accept=".png,.jpg,.jpeg,.webp,.txt,.log" style={{display: 'none'}} onChange={handleFileChange} />
                <button type="button" className="btn-file" onClick={() => document.getElementById('file-input').click()}>Choose Files</button>
                <div className="file-list">{formData.attachments.map(f => f.name).join(', ')}</div>
                <div id="consent-group" className="consent-group" style={{display: 'none'}}>
                  <label className="checkbox-label"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} /><span>I consent to share these files for debugging</span></label>
                </div>
              </div>
              <div className="form-group">
                <label>Tell us more (optional)</label>
                <textarea value={formData.feedback} onChange={(e) => setFormData({...formData, feedback: e.target.value})} maxLength="300" placeholder="What could we improve? Any specific errors?" />
                <span className="char-count"><span>{formData.feedback.length}</span>/300</span>
              </div>
              <div className="privacy-note">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                <span>No secrets leave your machine; uploads stored 30 days for troubleshooting.</span>
              </div>
              <div className="form-actions">
                <button type="button" className="btn-cancel" onClick={onClose}>Not now</button>
                <button type="submit" className="btn-submit" disabled={isSubmitting}>{isSubmitting ? 'Submitting...' : 'Submit'}</button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export default FeedbackModal;
