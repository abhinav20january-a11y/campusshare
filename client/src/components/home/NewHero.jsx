import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Search, MapPin, Leaf, Users, Repeat2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function NewHero({ onSearch }) {
  const reduce = useReducedMotion();
  const nav = useNavigate();
  const [q, setQ] = React.useState('');
  const [area, setArea] = React.useState('');

  const enter = {
    initial: reduce ? false : { opacity: 0, y: 18 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.55 },
  };

  const handleSubmit = e => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (area) params.set('location', area);
    nav('/items?' + params);
    if (onSearch) onSearch();
  };

  return (
    <section className="new-hero">
      <div className="new-hero-inner">
        <motion.div className="new-hero-copy" {...enter}>
          <p className="new-hero-eyebrow">Share more. Own less.</p>
          <h1>
            Share more.<br />
            <span>Own less.</span>
          </h1>
          <p className="new-hero-lede">
            Borrow what you need. Lend what you don’t.
            <br />
            A more affordable, sustainable campus for everyone.
          </p>
          <form className="new-hero-search" onSubmit={handleSubmit}>
            <label>
              <Search size={19} />
              <input
                aria-label="What do you need?"
                placeholder="What do you need?"
                value={q}
                onChange={e => setQ(e.target.value)}
              />
            </label>
            <label className="new-hero-area">
              <MapPin size={18} />
              <select
                aria-label="Campus pickup area"
                value={area}
                onChange={e => setArea(e.target.value)}
              >
                <option value="">Your campus</option>
                <option>Academic Block</option>
                <option>Hostels</option>
                <option>Sports Complex</option>
                <option>Library</option>
              </select>
            </label>
            <button type="submit">Search</button>
          </form>
        </motion.div>
      </div>
    </section>
  );
}
