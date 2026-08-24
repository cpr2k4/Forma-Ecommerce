import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

const WELCOME = {
  role: 'bot',
  text: 'Hi — I’m FORMA Assist. Ask about shipping, returns, payments, or products. Try “show me lamps”.',
  suggestions: ['Shipping info', 'Return policy', 'Show products', 'How to checkout'],
  products: [],
};

export default function ChatBot() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([WELCOME]);
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
      inputRef.current?.focus();
    }
  }, [open, messages, loading]);

  async function send(text) {
    const message = String(text || input).trim();
    if (!message || loading) return;

    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text: message }]);
    setLoading(true);

    try {
      const data = await api.chat({ message });
      setMessages((prev) => [
        ...prev,
        {
          role: 'bot',
          text: data.reply,
          suggestions: data.suggestions || [],
          products: data.products || [],
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'bot',
          text: err.message || 'Something went wrong. Please try again.',
          suggestions: ['Show products', 'Shipping info'],
          products: [],
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(e) {
    e.preventDefault();
    send(input);
  }

  return (
    <div className={`chatbot ${open ? 'is-open' : ''}`}>
      {open && (
        <div className="chatbot-panel" role="dialog" aria-label="FORMA Assist chat">
          <header className="chatbot-header">
            <div>
              <strong>FORMA Assist</strong>
              <p className="muted">Store help · product finder</p>
            </div>
            <button
              type="button"
              className="btn btn-ghost chatbot-close"
              onClick={() => setOpen(false)}
              aria-label="Close chat"
            >
              ✕
            </button>
          </header>

          <div className="chatbot-messages">
            {messages.map((msg, i) => (
              <div key={i} className={`chat-bubble chat-bubble-${msg.role}`}>
                <p className="chat-text">{msg.text}</p>
                {msg.products?.length > 0 && (
                  <ul className="chat-products">
                    {msg.products.map((p) => (
                      <li key={p.id}>
                        <Link to={`/product/${p.slug}`} onClick={() => setOpen(false)}>
                          {p.name}
                          <span>{p.price}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
                {msg.suggestions?.length > 0 && (
                  <div className="chat-suggestions">
                    {msg.suggestions.map((s) => (
                      <button key={s} type="button" className="chip" onClick={() => send(s)}>
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="chat-bubble chat-bubble-bot">
                <p className="chat-text muted">Thinking…</p>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <form className="chatbot-form" onSubmit={onSubmit}>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything…"
              maxLength={500}
              disabled={loading}
              aria-label="Chat message"
            />
            <button className="btn btn-primary" type="submit" disabled={loading || !input.trim()}>
              Send
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        className="chatbot-toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? 'Close chat' : 'Open chat'}
      >
        {open ? 'Close' : 'Chat'}
      </button>
    </div>
  );
}
