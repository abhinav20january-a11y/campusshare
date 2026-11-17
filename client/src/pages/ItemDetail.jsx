
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  ShieldCheck,
  MapPin,
  Clock,
  Heart,
  Share2,
  Flag,
  ArrowUpRight,
  Check
} from 'lucide-react';

import { useData } from '../hooks/useData';
import { useApp } from '../context/AppContext';
import { api, errorMessage } from '../api/client';

import {
  DataState,
  Badge,
  Avatar,
  Button,
  Field,
  Modal,
  ItemGrid
} from '../components/common/UI';

// ============================================
// IMAGE URL HELPER
// ============================================

// Backend serves locally uploaded images on port 3001.
// Absolute Cloudinary URLs are left unchanged.

const API_ORIGIN = (
  import.meta.env.VITE_API_URL || 'http://localhost:3001'
).replace(/\/+$/, '').replace(/\/api$/, '');

function getImageUrl(url) {
  if (!url) return '';

  // Preserve Cloudinary and other absolute URLs.
  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  // Resolve local uploaded images through the backend.
  return `${API_ORIGIN}${url.startsWith('/') ? '' : '/'}${url}`;
}

// ============================================
// ITEM DETAIL COMPONENT
// ============================================

export default function ItemDetail() {
  const { id } = useParams();

  const data = useData('/items/' + id);

  const { user, act, setToast } = useApp();

  const nav = useNavigate();

  const [image, setImage] = useState(0);
  const [modal, setModal] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(null);

  const item = data.data;

  const similar = useData(
    '/items?' +
    new URLSearchParams({
      category: item?.category || ''
    })
  );

  const isSaved = saved !== null
    ? saved
    : item?.saved;

  const images = item?.images || [];

  // ==========================================
  // WISHLIST
  // ==========================================

  async function toggleSave() {
    if (!user) {
      return nav('/login');
    }

    try {
      if (isSaved) {
        await act(
          () => api.delete(`/items/${id}/favorite`),
          'Removed from wishlist'
        );

        setSaved(false);
      } else {
        await act(
          () => api.post(`/items/${id}/favorite`),
          'Added to wishlist'
        );

        setSaved(true);
      }
    } catch (e) {
      setToast(errorMessage(e));
    }
  }

  // ==========================================
  // SHARE ITEM
  // ==========================================

  async function share() {
    try {
      if (navigator.share) {
        await navigator.share({
          title: item?.name,
          text: item?.description,
          url: location.href
        });
      } else {
        await navigator.clipboard.writeText(location.href);
        setToast('Link copied to clipboard');
      }
    } catch {
      setToast("Copy this page's address to share it");
    }
  }

  // ==========================================
  // BORROW / REPORT FORM
  // ==========================================

  async function submit(e) {
    e.preventDefault();

    setBusy(true);
    setError('');

    const b = Object.fromEntries(
      new FormData(e.currentTarget)
    );

    try {
      if (modal === 'borrow') {
        await act(
          () => api.post('/borrow-requests', {
            ...b,
            itemId: Number(id),
            startTime: new Date(b.startTime).toISOString(),
            endTime: new Date(b.endTime).toISOString()
          }),
          'Borrow request sent'
        );

        nav('/my-requests');
      } else {
        await act(
          () => api.post('/reports', {
            ...b,
            targetType: 'ITEM',
            targetId: Number(id)
          }),
          'Report submitted'
        );

        setModal('');
      }
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  function open(type) {
    if (!user) {
      return nav('/login');
    }

    setError('');
    setModal(type);
  }

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <div className="container">

      <Link className="back" to="/items">
        ← Back to the collection
      </Link>

      <DataState {...data}>
        {item && (
          <>
            <div className="detail-grid">

              {/* =================================
                  ITEM IMAGES
              ================================== */}

              <div>
                <div className="detail-photo">
                  {images.length > 0 ? (
                    <img
                      src={getImageUrl(
                        images[image]?.url || images[0]?.url
                      )}
                      alt={item.name}
                      onError={(e) => {
                        console.error(
                          'Failed to load item image:',
                          e.currentTarget.src
                        );
                      }}
                    />
                  ) : (
                    <p>No photo supplied</p>
                  )}
                </div>

                {images.length > 1 && (
                  <div className="thumbnails">
                    {images.map((img, index) => (
                      <button
                        aria-label={'View photo ' + (index + 1)}
                        key={img.id || index}
                        onClick={() => setImage(index)}
                        type="button"
                      >
                        <img
                          src={getImageUrl(img.url)}
                          alt=""
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* =================================
                  ITEM INFORMATION
              ================================== */}

              <div className="detail-info">

                <p className="eyebrow">
                  {item.category} / {item.subcategory || 'CAMPUS ESSENTIALS'}
                </p>

                <h1>{item.name}</h1>

                <div className="inline">
                  <Badge>{item.item_condition}</Badge>

                  <Badge tone="green">
                    Available to borrow
                  </Badge>
                </div>

                <p className="detail-description">
                  {item.description}
                </p>

                <div className="detail-facts">
                  <span>
                    <MapPin size={18} />
                    {item.location}
                  </span>

                  <span>
                    <Clock size={18} />
                    Up to {item.max_borrow_duration} hours
                  </span>

                  <span>
                    <ShieldCheck size={18} />
                    Verified campus member
                  </span>
                </div>

                {/* LENDER */}

                <div className="lender-card">
                  <Link to={`/users/${item.owner_id}`}>
                    <Avatar
                      name={item.owner_name}
                      src={item.owner_avatar}
                      size="large"
                    />

                    <div>
                      <small>SHARED BY</small>

                      <strong>{item.owner_name}</strong>

                      <span>
                        ★ {Number(item.average_rating).toFixed(1)}
                        {' · '}
                        Trust {item.trust_score}/100
                      </span>
                    </div>
                  </Link>

                  <ArrowUpRight size={20} />
                </div>

                {/* OWNER / BORROWER ACTION */}

                {user?.id === item.owner_id ? (
                  <Link
                    className="button full"
                    to={`/items/${id}/edit`}
                  >
                    Edit your listing
                  </Link>
                ) : (
                  <Button
                    variant="full"
                    onClick={() => open('borrow')}
                  >
                    Request to borrow
                    <ArrowUpRight size={18} />
                  </Button>
                )}

                {/* ITEM ACTIONS */}

                <div className="detail-actions">
                  <button
                    onClick={toggleSave}
                    className={isSaved ? 'saved' : ''}
                  >
                    <Heart
                      size={16}
                      fill={isSaved ? 'currentColor' : 'none'}
                    />

                    {isSaved ? 'Saved' : 'Save'}
                  </button>

                  <button onClick={share}>
                    <Share2 size={16} />
                    Share
                  </button>

                  <button onClick={() => open('report')}>
                    <Flag size={16} />
                    Report
                  </button>
                </div>

                <p className="small muted">
                  Borrowing connects students. No purchase or payment is required.
                </p>

              </div>
            </div>

            {/* =================================
                ADDITIONAL ITEM DETAILS
            ================================== */}

            <div className="detail-columns">

              <section>
                <h2>The little details.</h2>

                <h3>What's included</h3>

                <p>
                  {item.included ||
                    'Ask the owner about included accessories.'}
                </p>

                <h3>Condition notes</h3>

                <p>
                  {item.condition_notes ||
                    'The owner has listed this item in ' +
                    item.item_condition.toLowerCase() +
                    ' condition.'}
                </p>

                <h3>Pickup</h3>

                <p>
                  {item.pickup_instructions || item.location}
                </p>
              </section>

              <section className="panel">
                <h2>A few ground rules.</h2>

                {(item.rules || []).map(rule => (
                  <p className="inline" key={rule}>
                    <Check size={17} />
                    {rule}
                  </p>
                ))}

                <p>
                  Confirm the item's condition together before and after borrowing.
                </p>
              </section>

            </div>

            {/* =================================
                SIMILAR ITEMS
            ================================== */}

            <section>
              <div className="section-title">
                <h2>You might also need.</h2>

                <Link to={'/items?category=' + item.category}>
                  Explore more ↗
                </Link>
              </div>

              <ItemGrid
                items={
                  similar.data?.items
                    ?.filter(x => x.id !== item.id)
                    .slice(0, 4)
                }
              />
            </section>

          </>
        )}
      </DataState>

      {/* ======================================
          BORROW / REPORT MODAL
      ======================================= */}

      {modal && (
        <Modal
          title={
            modal === 'borrow'
              ? 'Make a little request.'
              : 'Report this listing'
          }
          onClose={() => setModal('')}
        >
          <form onSubmit={submit}>

            {modal === 'borrow' ? (
              <>
                <p>
                  Choose your dates. The owner will review your request
                  before the item is reserved.
                </p>

                <div className="form-grid">
                  <Field
                    label="Borrow from"
                    name="startTime"
                    type="datetime-local"
                    required
                  />

                  <Field
                    label="Return by"
                    name="endTime"
                    type="datetime-local"
                    required
                  />
                </div>

                <Field
                  label="What do you need it for?"
                  name="purpose"
                  required
                  maxLength="300"
                />

                <Field label="Message to the owner">
                  <textarea
                    name="message"
                    rows="3"
                    maxLength="1000"
                  />
                </Field>

                <p className="notice">
                  Pickup: {item?.location}.
                  Maximum {item?.max_borrow_duration} hours.
                </p>
              </>
            ) : (
              <>
                <Field label="Reason">
                  <select name="reason">
                    <option>Misleading Listing</option>
                    <option>Unsafe Item</option>
                    <option>Spam</option>
                    <option>Other</option>
                  </select>
                </Field>

                <Field label="Details">
                  <textarea
                    name="description"
                    required
                    rows="4"
                  />
                </Field>
              </>
            )}

            {error && (
              <p className="error">{error}</p>
            )}

            <Button busy={busy} type="submit">
              {modal === 'borrow'
                ? 'Send borrow request'
                : 'Submit report'}
            </Button>

          </form>
        </Modal>
      )}

    </div>
  );
}
