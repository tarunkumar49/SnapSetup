import React, { useState } from 'react';
import './FeedbackModal.css';

function FeedbackModal({ isOpen, onClose }) {
  const [formData, setFormData] = useState({ type: 'bug', message: '', email: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Using Formspree (free service) - replace with your form endpoint
    // Sign up at https://formspree.io/ and get your form ID
    const FORM_ENDPOINT = 'https://formspree.io/f/YOUR_FORM_ID'; // Replace with your endpoint

    try {
      const response = await fetch(FORM_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setSubmitted(true);
        setTimeout(() => {
          onClose();
          setSubmitted(false);
          setFormData({ type: 'bug', message: '', email: '' });
        }, 2000);
      }
    } catch (error) {
      alert('Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="feedback-modal-overlay" onClick={onClose}>
      <div className="feedback-modal" onClick={(e) => e.stopPropagation()}>
        <div className="feedback-header">
          <h3>Send Feedback</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        {submitted ? (
          <div className="feedback-success">
            <div className="success-icon">✓</div>
            <p>Thank you for your feedback!</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="feedback-form">
            <div className="form-group">
              <label>Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              >
                <option value="bug">Bug Report</option>
                <option value="feature">Feature Request</option>
                <option value="feedback">General Feedback</option>
              </select>
            </div>

            <div className="form-group">
              <label>Message *</label>
              <textarea
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Describe the issue or share your thoughts..."
                rows="5"
                required
              />
            </div>

            <div className="form-group">
              <label>Email (optional)</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="your@email.com"
              />
            </div>

            <div className="form-actions">
              <button type="button" onClick={onClose} className="btn-cancel">
                Cancel
              </button>
              <button type="submit" disabled={isSubmitting} className="btn-submit">
                {isSubmitting ? 'Sending...' : 'Send Feedback'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default FeedbackModal;
