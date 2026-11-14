import {
  Link,
  useParams,
  useSearchParams,
  useNavigate
} from 'react-router-dom';

import {useState} from 'react';

import {
  Bell,
  Users,
  ArrowUpRight,
  Plus,
  Copy
} from 'lucide-react';

import {useData} from '../hooks/useData';
import {useApp} from '../context/AppContext';
import {api,errorMessage} from '../api/client';

import {
  DataState,
  PageHead,
  Button,
  Badge,
  Avatar,
  Field,
  Modal,
  formatDate,
  Empty
} from '../components/common/UI';
export function Notifications(){const d=useData('/notifications'),{act}=useApp();async function read(id){try{await act(()=>api.put('/notifications/'+(id?id+'/read':'read-all')));d.refresh()}catch{}}return <div className="container narrow"><PageHead eyebrow="IN THE LOOP" title="Your notifications."><Button variant="secondary" onClick={()=>read()}>Mark all read</Button></PageHead><DataState {...d}>{d.data?.length?d.data.map(n=><article key={n.id} className={'notification panel '+(!n.is_read?'unread':'')}><Bell size={20}/><div><Link to={n.link||'/dashboard'} onClick={()=>read(n.id)}><h3>{n.title}</h3></Link><small>{formatDate(n.created_at)}</small></div>{!n.is_read&&<button className="text-link" onClick={()=>read(n.id)}>Mark read</button>}</article>):<Empty title="You’re all caught up"/>}</DataState></div>}

export function Circles() {
  const {id} = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const d = useData('/circles' + (id ? '/' + id : ''));

  const {user, act, setToast} = useApp();

  // Invitation modal state
  const initialInvite = searchParams.get('invite') || '';
  const initialCircle = searchParams.get('circle') || '';

  const [modal, setModal] = useState(Boolean(initialInvite));
  const [targetCircle, setTargetCircle] = useState(initialCircle);
  const [inviteCode, setInviteCode] = useState(initialInvite);

  // Create circle modal state
  const [createModal, setCreateModal] = useState(false);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);


  // JOIN OR LEAVE CIRCLE
  async function join(circleId, leave = false) {
    try {
      setError('');
      setLoading(true);

      if (leave) {
        await act(
          () => api.delete(`/circles/${circleId}/members`),
          'You left the circle'
        );

        if (id) {
          navigate('/circles');
        } else {
          d.refresh();
        }

        return;
      }

      // Directly join the circle without extra validation
      await act(() => api.post(`/circles/${circleId}/members`), 'You joined the circle successfully');

      setModal(false);
      setInviteCode('');
      setTargetCircle('');

      navigate(`/circles/${circleId}`);

    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }


  // OPEN INVITATION MODAL
  function openJoinModal(circleId) {
    setTargetCircle(String(circleId));
    // Preserve any existing invitation code (e.g., from URL) instead of clearing it.
    // Only reset error state and show modal.
    setError('');
    setModal(true);
  }


  // CREATE CIRCLE
  async function create(e) {
    e.preventDefault();

    try {
      setError('');
      setLoading(true);

      const formData = new FormData(e.currentTarget);

      const result = await api.post(
        '/circles',
        Object.fromEntries(formData)
      );

      await act(
        () => Promise.resolve(result),
        'Circle created successfully'
      );

      setCreateModal(false);
      d.refresh();

      if (result?.data?.id) {
        // Auto‑copy invitation link for the owner
   const inviteLink = `${window.location.origin}/circle-invite?code=${result.data.invite_code}`;
   await navigator.clipboard.writeText(inviteLink);
   setToast('Invitation link copied to clipboard!');
   navigate(`/circles/${result.data.id}`);
      } else if (result?.id) {
        navigate(`/circles/${result.id}`);
      }

    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }


  // COPY INVITATION LINK
  async function copyInviteLink() {
    try {
      const code = d.data?.invite_code;

      if (!code) {
        setToast('Invitation code is unavailable.');
        return;
      }

      const link =
        `${window.location.origin}/circles` +
        `?circle=${id}&invite=${encodeURIComponent(code)}`;

      await navigator.clipboard.writeText(link);

      setToast('Invitation link copied successfully!');
    } catch {
      setToast('Could not copy invitation link.');
    }
  }


  // CIRCLE DETAILS PAGE
  if (id) {
    return (
      <div className="container">

        <PageHead
          eyebrow="YOUR PEOPLE, YOUR THINGS"
          title={d.data?.name || 'Circle details'}
          description="Your private campus community."
        />

        <DataState {...d}>
          {d.data && (
            <div className="workspace-grid">

              <section className="panel">

                <h2>About this circle</h2>

                <p>{d.data.description}</p>

                <h3>Our rules</h3>

                <p>{d.data.rules}</p>


                {/* OWNER INVITATION LINK */}
                {Number(d.data.owner_id) === Number(user.id) &&
                  d.data.invite_code && (
                    <div className="space-top">

                      <h3>Invite members</h3>

                      <p>
                        Share this private invitation link
                        with students you want to invite.
                      </p>

                      <Button
                        variant="secondary"
                        onClick={copyInviteLink}
                      >
                        <Copy size={16} />
                        Copy invitation link
                      </Button>

                    </div>
                  )}


                <h3 className="space-top">
                  Shared with the circle
                </h3>

                {(d.data.items || []).length ? (
                  (d.data.items || []).map(item => (
                    <Link
                      className="exchange-row"
                      to={`/items/${item.id}`}
                      key={item.id}
                    >
                      {item.image && (
                        <img src={item.image} alt="" />
                      )}

                      {item.name}

                      <ArrowUpRight size={16} />
                    </Link>
                  ))
                ) : (
                  <Empty
                    title="No shared items yet"
                    description="Items shared with this circle will appear here."
                  />
                )}

              </section>


              {/* MEMBERS SECTION */}
              <section className="panel">

                <h2>
                  {(d.data.members || []).length} members
                </h2>

                {(d.data.members || []).map(member => (
                  <Link
                    key={member.id}
                    to={`/users/${member.id}`}
                    className="member-row"
                  >
                    <Avatar name={member.name} />
                    {member.name}

                    {Number(member.id) === Number(d.data.owner_id) && (
                      <Badge tone="green">Owner</Badge>
                    )}
                  </Link>
                ))}


                {/* LEAVE BUTTON FOR NORMAL MEMBERS */}
                {Number(d.data.owner_id) !== Number(user.id) && (
                  <Button
                    variant="secondary"
                    onClick={() => join(id, true)}
                  >
                    Leave circle
                  </Button>
                )}

              </section>

            </div>
          )}
        </DataState>

      </div>
    );
  }


  // CIRCLE DISCOVERY PAGE
  return (
    <div className="container">

      <PageHead
        eyebrow="YOUR PEOPLE, YOUR THINGS"
        title="Small circles. Big possibilities."
        description="Share a little closer with your club, classmates or hostel."
      >

        <Button onClick={() => {
          setError('');
          setCreateModal(true);
        }}>
          <Plus size={16} />
          Create a circle
        </Button>

      </PageHead>


      <DataState {...d}>

        {d.data?.length ? (

          <div className="request-grid">

            {d.data.map(circle => {

              const isOwner =
                Number(circle.owner_id) === Number(user.id);

              const joined = Boolean(circle.joined);

              return (
                <article
                  className="panel circle-card"
                  key={circle.id}
                >

                  <Users size={30} />

                  {joined ? (
                    <Link to={`/circles/${circle.id}`}>
                      <h2>{circle.name}</h2>
                    </Link>
                  ) : (
                    <h2>{circle.name}</h2>
                  )}

                  <p>{circle.description}</p>

                  <div className="section-title">

                    <span>
                      {circle.members} members
                    </span>

                    {isOwner ? (
                      <Badge tone="green">Owner</Badge>
                    ) : joined ? (
                      <Button
                        variant="secondary"
                        onClick={() => join(circle.id, true)}
                      >
                        Leave
                      </Button>
                    ) : (
                      <Button
                        onClick={() => openJoinModal(circle.id)}
                      >
                        Join circle
                      </Button>
                    )}

                  </div>

                </article>
              );
            })}

          </div>

        ) : (
          <Empty
            title="No circles yet"
            description="Create a circle and invite your campus community."
          />
        )}

      </DataState>


      {/* JOIN CIRCLE MODAL */}
      {modal && (
        <Modal
          title="Join a private circle"
          onClose={() => {
            setModal(false);
            setError('');
          }}
        >

          <form
            onSubmit={e => {
              e.preventDefault();
              join(targetCircle, false);
            }}
          >

            <p>
              Enter the invitation code shared by the
              circle owner to become a member.
            </p>

            <Field label="Invitation code">

              <input
                type="text"
                value={inviteCode}
                onChange={e => setInviteCode(e.target.value)}
                placeholder="Enter your 32-character code"
                maxLength={32}
                required
              />

            </Field>

            {error && (
              <p className="error">{error}</p>
            )}

            <Button
              type="submit"
              disabled={loading || !inviteCode.trim() || !targetCircle}
            >
              {loading ? 'Joining...' : 'Join circle'}
            </Button>

          </form>

        </Modal>
      )}


      {/* CREATE CIRCLE MODAL */}
      {createModal && (
        <Modal
          title="Bring your people together"
          onClose={() => {
            setCreateModal(false);
            setError('');
          }}
        >

          <form onSubmit={create}>

            <Field
              label="Circle name"
              name="name"
              required
            />

            <Field label="About your circle">

              <textarea
                name="description"
                rows="3"
                required
              />

            </Field>

            <Field label="Rules">

              <textarea
                name="rules"
                rows="3"
                placeholder="Respect fellow members."
              />

            </Field>

            {error && (
              <p className="error">{error}</p>
            )}

            <Button
              type="submit"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create circle'}
            </Button>

          </form>

        </Modal>
      )}

    </div>
  );
}
export function Profile(){const {id}=useParams(),d=useData('/users/'+id),reviews=useData(`/users/${id}/reviews`);return <div className="container narrow"><DataState {...d}>{d.data&&<><div className="profile-hero"><Avatar name={d.data.name} src={d.data.avatar} size="xl"/><div><Badge tone="green">{d.data.verified?'Verified student':'Verification pending'}</Badge><h1>{d.data.name}</h1><p>{d.data.university} · {d.data.department} · Year {d.data.year}</p><small>Member since {formatDate(d.data.created_at)}</small></div></div><div className="stats-grid"><div className="stat"><strong>{d.data.completed_borrows||0}</strong><span>Completed borrows</span></div><div className="stat"><strong>{d.data.successful_lends||0}</strong><span>Successful lends</span></div><div className="stat"><strong>{Number(d.data.average_rating).toFixed(1)}</strong><span>Average rating</span></div><div className="stat"><strong>{d.data.completed_borrows||d.data.successful_lends?d.data.trust_score:'New'}</strong><span>Community trust</span></div></div><Link className="button secondary" to={'/items?owner='+id}>View shared items <ArrowUpRight size={16}/></Link><h2 className="space-top">From the community</h2>{reviews.data?.length?reviews.data.map(r=><blockquote className="panel" key={r.id}><strong>★ {r.rating} · {r.reviewer_name}</strong><p>{r.comment}</p><small>{formatDate(r.created_at)}</small></blockquote>):<Empty title="A fresh start" description="Reviews appear after completed exchanges." to={null}/>}</>}</DataState></div>}
export function DisputeDetail(){const {id}=useParams(),d=useData('/disputes/'+id);return <div className="container narrow"><PageHead eyebrow="SUPPORT CASE" title={'Dispute #'+id}/><DataState {...d}>{d.data&&<div className="panel"><Badge>{d.data.status}</Badge><h2>{d.data.reason}</h2><p>{d.data.description}</p><Link to={'/borrowings/'+d.data.transaction_id}>View exchange →</Link><div className="evidence-gallery">{d.data.evidence.map((e,i)=><img key={i} src={e.url} alt="Dispute evidence"/>)}</div>{d.data.resolution&&<div className="notice"><h3>{d.data.decision?.replaceAll('_',' ')}</h3><p>{d.data.resolution}</p></div>}</div>}</DataState></div>}
