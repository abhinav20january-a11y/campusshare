
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { api, get, errorMessage } from '../api/client';
import { useApp } from '../context/AppContext';
import { PageHead, Field, Button } from '../components/common/UI';
import Uploads from '../components/common/Uploads';
import { categoryIcons } from './Home';

const steps = [
  'Information',
  'Photos',
  'Condition',
  'Availability',
  'Pickup',
  'Rules',
  'Review'
];

const formatINR = (amount) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2
  }).format(Number(amount) || 0);

export default function ListingForm() {
  const { id } = useParams();
  const nav = useNavigate();
  const { setToast } = useApp();

  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [images, setImages] = useState([]);

  const [form, setForm] = useState({
    name: '',
    category: 'Electronics',
    subcategory: '',
    description: '',
    condition: 'EXCELLENT',
    conditionNotes: '',
    maxDuration: 168,
    location: 'Academic Block',
    building: '',
    pickupInstructions: '',
    included: '',
    borrowingFee: '0.00',
    securityDeposit: '0.00',
    rules: 'Return all accessories\nHandle carefully'
  });

  // Load existing item when editing
  useEffect(() => {
    if (id) {
      get('/items/' + id)
        .then(i => {
          setForm(prev => ({
            ...prev,
            ...i,
            condition: i.item_condition,
            maxDuration: i.max_borrow_duration,
            conditionNotes: i.condition_notes || '',
            pickupInstructions: i.pickup_instructions || '',
            borrowingFee: String(i.borrowing_fee ?? 0),
            securityDeposit: String(i.security_deposit ?? 0),
            rules: (i.rules || []).join('\n')
          }));

          if (i.images) {
            setImages(i.images);
          }
        })
        .catch(e => setError(errorMessage(e)));
    }
  }, [id]);

  // Common field helper
  const field = (key, label, props = {}) => (
    <Field
      label={label}
      value={form[key] ?? ''}
      onChange={e =>
        setForm(prev => ({
          ...prev,
          [key]: e.target.value
        }))
      }
      {...props}
    />
  );

  // Calculate total payable amount
  const totalPayable =
    (Number(form.borrowingFee) || 0) +
    (Number(form.securityDeposit) || 0);

  async function submit(e) {
    e.preventDefault();

    if (step < 6) {
      setStep(step + 1);
      setError('');
      return;
    }

    setBusy(true);
    setError('');

    try {
      const payload = {
        ...form,
        borrowingFee: Number(form.borrowingFee || 0),
        securityDeposit: Number(form.securityDeposit || 0),
        rules: form.rules.split('\n').filter(Boolean),
        ...(images.length
          ? { images: images.map(i => i.id) }
          : {})
      };

      const { data: { data } } = await api[
        id ? 'put' : 'post'
      ](
        '/items' + (id ? '/' + id : ''),
        payload
      );

      setToast('Item listed successfully');
      nav('/items/' + data.id);

    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container narrow">

      <PageHead
        eyebrow="MAKE SOMEONE’S DAY"
        title={id
          ? 'Give your listing an update.'
          : 'Something useful to share?'}
      />

      {/* Stepper */}
      <div className="stepper">
        {steps.map((label, i) => (
          <span
            className={i <= step ? 'active' : ''}
            key={label}
          >
            <i>
              {i < step
                ? <Check size={14} />
                : i + 1}
            </i>
            {label}
          </span>
        ))}
      </div>

      <form
        className="panel listing-form"
        onSubmit={submit}
      >

        <p className="eyebrow">
          STEP {step + 1} OF 7
        </p>

        <h2>{steps[step]}</h2>

        {/* STEP 1: INFORMATION */}
        {step === 0 && (
          <>
            {field('name', 'Item name', {
              required: true,
              maxLength: 140
            })}

            <div className="form-grid">
              <Field label="Category">
                <select
                  value={form.category}
                  onChange={e =>
                    setForm(prev => ({
                      ...prev,
                      category: e.target.value
                    }))
                  }
                >
                  {Object.keys(categoryIcons).map(c => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Field>

              {field('subcategory', 'Subcategory')}
            </div>

            <Field label="Tell us about your item">
              <textarea
                required
                minLength="20"
                rows="5"
                value={form.description}
                onChange={e =>
                  setForm(prev => ({
                    ...prev,
                    description: e.target.value
                  }))
                }
              />
            </Field>

            {field('included', 'What’s included?')}

            {/* PRICING SECTION */}
            <div className="pricing-section">
              <h3>Borrowing & Security Pricing</h3>

              <p className="small muted">
                Set the borrowing charge and refundable
                security deposit for your item.
              </p>

              {field(
                'borrowingFee',
                'Borrowing fee (₹)',
                {
                  type: 'number',
                  min: 0,
                  max: 99999999.99,
                  step: '0.01',
                  required: true
                }
              )}

              <p className="small muted">
                The amount charged for borrowing this item.
              </p>
              {field(
                'securityDeposit',
                'Refundable security deposit (₹)',
                {
                  type: 'number',
                  min: 0,
                  max: 99999999.99,
                  step: '0.01',
                  required: true
                }
              )}

              <p className="small muted">
                This deposit is intended to be refunded
                after the owner confirms the safe return
                of the item.
              </p>

              <div className="pricing-total">
                <span>Total payable by borrower</span>
                <strong>{formatINR(totalPayable)}</strong>
              </div>
            </div>
          </>
        )}

        {/* STEP 2: PHOTOS */}
        {step === 1 && (
          <>
            <p>
              Show the item clearly, including its accessories
              and any visible wear.
            </p>

            <Uploads
              value={images}
              onChange={setImages}
            />

            {id && !images.length && (
              <p className="small muted">
                Existing listing photos are retained until
                you upload replacements.
              </p>
            )}
          </>
        )}

        {/* STEP 3: CONDITION */}
        {step === 2 && (
          <>
            <Field label="Condition">
              <select
                value={form.condition}
                onChange={e =>
                  setForm(prev => ({
                    ...prev,
                    condition: e.target.value
                  }))
                }
              >
                {['NEW', 'EXCELLENT', 'GOOD', 'USED'].map(c => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </Field>

            {field(
              'conditionNotes',
              'Anything the borrower should know?'
            )}
          </>
        )}

        {/* STEP 4: AVAILABILITY */}
        {step === 3 && (
          <>
            {field(
              'maxDuration',
              'Maximum borrowing duration (hours)',
              {
                type: 'number',
                min: 1,
                max: 720,
                required: true
              }
            )}

            <div className="form-grid">
              {field(
                'availableStart',
                'Available from',
                { type: 'datetime-local' }
              )}

              {field(
                'availableEnd',
                'Available until',
                { type: 'datetime-local' }
              )}
            </div>

            <p>
              Leave the dates blank for open availability.
              Confirmed reservations are always blocked automatically.
            </p>
          </>
        )}

        {/* STEP 5: PICKUP */}
        {step === 4 && (
          <>
            {field('location', 'Pickup area', {
              required: true
            })}

            {field('building', 'Building / hostel')}

            {field(
              'pickupInstructions',
              'Pickup instructions'
            )}
          </>
        )}

        {/* STEP 6: RULES */}
        {step === 5 && (
          <>
            <Field label="Lending rules — one per line">
              <textarea
                rows="6"
                value={form.rules}
                onChange={e =>
                  setForm(prev => ({
                    ...prev,
                    rules: e.target.value
                  }))
                }
              />
            </Field>

            {field(
              'circleId',
              'Circle ID (optional)',
              {
                type: 'number',
                min: 1
              }
            )}
          </>
        )}

        {/* STEP 7: REVIEW */}
        {step === 6 && (
          <div className="review-listing">

            <h3>{form.name}</h3>

            <p>{form.description}</p>

            <dl>
              <dt>Category</dt>
              <dd>{form.category}</dd>

              <dt>Condition</dt>
              <dd>{form.condition}</dd>

              <dt>Pickup</dt>
              <dd>{form.location}</dd>

              <dt>Maximum duration</dt>
              <dd>{form.maxDuration} hours</dd>
            </dl>

            <div className="pricing-section">
              <h3>Pricing Summary</h3>

              <dl>
                <dt>Borrowing fee</dt>
                <dd>{formatINR(form.borrowingFee)}</dd>

                <dt>Refundable security deposit</dt>
                <dd>{formatINR(form.securityDeposit)}</dd>
              </dl>

              <div className="pricing-total">
                <span>Total payable</span>
                <strong>{formatINR(totalPayable)}</strong>
              </div>

              <p className="small muted">
                The security deposit is refundable subject
                to the owner's confirmation of the returned
                item's condition.
              </p>
            </div>

            <p>{form.rules}</p>

          </div>
        )}

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        {/* NAVIGATION */}
        <div className="form-actions">

          {step > 0 && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setStep(step - 1);
                setError('');
              }}
            >
              <ArrowLeft size={16} />
              Back
            </Button>
          )}

          <Button type="submit" busy={busy}>
            {step === 6
              ? 'Publish listing'
              : 'Continue'}

            <ArrowRight size={16} />
          </Button>

        </div>

      </form>
    </div>
  );
}
