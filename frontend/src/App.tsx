import React, { useState, useEffect } from 'react';
import './App.css';

interface Post {
  id: string;
  author: string;
  role: 'celebrity' | 'public';
  content: string;
  image?: string;
  createdAt: number;
}

function App() {
  const [user, setUser] = useState<{ role: 'celebrity' | 'public'; name: string } | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [content, setContent] = useState('');
  const [image, setImage] = useState<string | undefined>(undefined);
  const [pageView, setPageView] = useState<'login' | 'feed'>('login');

  const dummyCeleb = { role: "celebrity" as const, name: 'Demo Celebrity' };
  const dummyPublic = { role: "public" as const, name: 'Demo Public' };

  // Simulate JWT (mock) on login
  const handleLogin = (user: { role: 'celebrity' | 'public'; name: string }) => {
    // In a real app, you would get a JWT from the backend
    const mockJwt = btoa(JSON.stringify({ ...user, exp: Date.now() + 3600_000 }));
    localStorage.setItem('mock_jwt', mockJwt);
    setUser(user);
    setPageView('feed');
  };

  // On mount, check for mock JWT
  useEffect(() => {
    const token = localStorage.getItem('mock_jwt');
    if (token) {
      try {
        const payload = JSON.parse(atob(token));
        if (payload.exp > Date.now()) {
          setUser({ role: payload.role, name: payload.name });
          setPageView('feed');
        } else {
          localStorage.removeItem('mock_jwt');
          setPageView('login');
        }
      } catch {
        localStorage.removeItem('mock_jwt');
        setPageView('login');
      }
    } else {
      setPageView('login');
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('mock_jwt');
    setUser(null);
    setPageView('login');
  };

  // --- WebSocket real-time updates ---
  const wsRef = React.useRef<WebSocket | null>(null);

  // For following celebrities (public users)
  const [following, setFollowing] = useState<string[]>([]); // celebrity names
  // Like and comment state for posts (public side)
  const [likes, setLikes] = useState<{ [postId: string]: number }>({});
  // Add a comment (public only)
  // const handleAddComment = (postId: string) => {
  //   const text = commentInputs[postId]?.trim();
  //   if (!text) return;
  //   setComments(prev => ({
  //     ...prev,
  //     [postId]: [...(prev[postId] || []), text],
  //   }));
  //   setCommentInputs(prev => ({ ...prev, [postId]: '' }));
  // };

  // On mount, load likes from localStorage for cross-user simulation
  useEffect(() => {
    const storedLikes = localStorage.getItem('likes');
    if (storedLikes) {
      setLikes(JSON.parse(storedLikes));
    }
  }, []);

  // Listen for likes changes in other tabs (simulate cross-user update)
  useEffect(() => {
    const syncLikes = (e: StorageEvent) => {
      if (e.key === 'likes') {
        const storedLikes = localStorage.getItem('likes');
        if (storedLikes) {
          setLikes(JSON.parse(storedLikes));
        }
      }
    };
    window.addEventListener('storage', syncLikes);

    // Like notification polling for celebrities (removed feature)
    // let lastLikes = { ...likes };
    // const interval = setInterval(() => {
    //   if (user?.role === 'celebrity') {
    //     const storedLikes = localStorage.getItem('likes');
    //     if (storedLikes) {
    //       const parsed = JSON.parse(storedLikes);
    //       Object.entries(parsed).forEach(([postId, countRaw]) => {
    //         const count = typeof countRaw === 'number' ? countRaw : 0;
    //         const prev = lastLikes[postId] || 0;
    //         if (count > prev) {
    //           setLikeNotifs(prevNotifs => [
    //             { postId, count: count - prev, timestamp: Date.now() },
    //             ...prevNotifs
    //           ].slice(0, 10));
    //         }
    //       });
    //       lastLikes = { ...parsed };
    //     }
    //   }
    // }, 1000);

    return () => {
      window.removeEventListener('storage', syncLikes);
      // clearInterval(interval);
    };
  }, [user, likes]);

  // On mount, connect to WebSocket
  React.useEffect(() => {
    if (!user) return;
    wsRef.current = new WebSocket('ws://localhost:4000');
    wsRef.current.onopen = () => {
      wsRef.current?.send(JSON.stringify({ type: 'subscribe', user: user.name, role: user.role, following }));
    };
    wsRef.current.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === 'new_post') {
        setAllPosts(prev => {
          if (prev.some(post => post.id === msg.post.id)) return prev;
          return [msg.post, ...prev];
        });
      }
    };
    return () => {
      wsRef.current?.close();
    };
    // eslint-disable-next-line
  }, [user, following]);

  // On celebrity post, send to backend via WebSocket
  const handleCreatePost = () => {
    if (!user || user.role !== 'celebrity' || !content.trim()) return;
    const newPost: Post = {
      id: Date.now().toString() + '-' + Math.random().toString(36).substr(2, 9),
      author: user.name,
      role: user.role,
      content,
      image,
      createdAt: Date.now(),
    };
    setPosts([newPost, ...posts]);
    setContent('');
    setImage(undefined);
    // Send to backend for broadcast
    wsRef.current?.send(JSON.stringify({ type: 'create_post', post: newPost }));
  };

  // Handle image upload (mock, just base64)
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  // Like a post (public and celebrity)
  const handleLike = (postId: string) => {
    setLikes(prev => {
      const newCount = (prev[postId] || 0) + 1;
      const updated = { ...prev, [postId]: newCount };
      localStorage.setItem('likes', JSON.stringify(updated));
      // No manual dispatch of 'storage' event
      return updated;
    });
  };

  // Infinite scroll: load more posts on scroll (mock, paginated)
  const PAGE_SIZE = 5;
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Simulate a global post store for demo (in real app, fetch from backend)
  const [allPosts, setAllPosts] = useState<Post[]>([]);

  // Add celebrity to following list
  const handleFollow = (celebName: string) => {
    if (!following.includes(celebName)) setFollowing([...following, celebName]);
  };
  const handleUnfollow = (celebName: string) => {
    setFollowing(following.filter(name => name !== celebName));
  };

  // When a celebrity posts, add to global posts (simulate real-time)
  React.useEffect(() => {
    if (posts.length > 0 && user?.role === 'celebrity') {
      setAllPosts(prev => [posts[0], ...prev]);
    }
    // eslint-disable-next-line
  }, [posts]);

  // Infinite scroll logic
  const feedRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const onScroll = () => {
      if (!feedRef.current || !hasMore) return;
      const { scrollTop, scrollHeight, clientHeight } = feedRef.current;
      if (scrollTop + clientHeight >= scrollHeight - 50) {
        setPage(p => {
          if ((p + 1) * PAGE_SIZE < allPosts.length) {
            return p + 1;
          } else {
            setHasMore(false);
            return p;
          }
        });
      }
    };
    const feedDiv = feedRef.current;
    if (feedDiv) feedDiv.addEventListener('scroll', onScroll);
    return () => feedDiv?.removeEventListener('scroll', onScroll);
  }, [allPosts.length, hasMore]);

  // Filter feed for public users (only followed celebrities)
  const visiblePosts = user?.role === 'public'
    ? allPosts.filter(post => following.includes(post.author)).slice(0, page * PAGE_SIZE)
    : allPosts.slice(0, page * PAGE_SIZE);

  // Real-time notification badge (new posts since last view)
  const [lastSeen, setLastSeen] = useState(Date.now());
  const newPostsCount = allPosts.filter(post => post.createdAt > lastSeen && (user?.role !== 'public' || following.includes(post.author))).length;

  // List all unique celebrities from posts
  const allCelebrities = Array.from(new Set(allPosts.filter(p => p.role === 'celebrity').map(p => p.author)));

  // Browse celebrities tab for public users
  const [showCelebTab, setShowCelebTab] = useState(false);
  const renderCelebTab = () => (
    <div className="celeb-tab">
      <h3>Browse Celebrities</h3>
      {allCelebrities.length === 0 ? <div>No celebrities yet.</div> : (
        <ul className="celeb-list">
          {allCelebrities.map(name => (
            <li key={name}>
              <span>{name}</span>
              {following.includes(name)
                ? <button className="unfollow-btn" onClick={() => handleUnfollow(name)}>Unfollow</button>
                : <button className="follow-btn" onClick={() => handleFollow(name)}>Follow</button>
              }
            </li>
          ))}
        </ul>
      )}
      <button onClick={() => setShowCelebTab(false)} className="close-celeb">Close</button>
    </div>
  );

  // Feed rendering
  const renderFeed = () => (
    <div className="feed" ref={feedRef} style={{ maxHeight: 500, overflowY: 'auto' }}>
      {visiblePosts.length === 0 && <div className="empty-feed">No posts yet.</div>}
      {visiblePosts.map(post => (
        <div className="post" key={post.id}>
          <div className="post-header">
            <b>{post.author}</b> <span className="role-badge">{post.role}</span>
            <span className="timestamp">{new Date(post.createdAt).toLocaleString()}</span>
            {user?.role === 'public' && post.role === 'celebrity' && (
              following.includes(post.author)
                ? <button className="unfollow-btn" onClick={() => handleUnfollow(post.author)}>Unfollow</button>
                : <button className="follow-btn" onClick={() => handleFollow(post.author)}>Follow</button>
            )}
          </div>
          <div className="post-content">{post.content}</div>
          {post.image && (
            <img
              src={post.image}
              alt="post"
              className="post-image"
              loading="lazy"
              style={{ opacity: 0, transition: 'opacity 0.4s' }}
              onLoad={e => (e.currentTarget.style.opacity = '1')}
            />
          )}
          {/* Like & Comment buttons for public users only */}
          {user?.role === 'public' && (
            <div className="like-comment-row">
              <button className="like-btn" onClick={() => handleLike(post.id)}>
                <span role="img" aria-label="like">👍</span> Like {likes[post.id] ? `(${likes[post.id]})` : ''}
              </button>
              {/* Comment input removed for public users */}
            </div>
          )}
          {/* Show comments if any */}
          {/* {comments[post.id] && comments[post.id].length > 0 && (
            <div className="comments-list" style={{ marginTop: '0.7rem', textAlign: 'left' }}>
              {comments[post.id].map((c, i) => (
                <div key={i} style={{ background: '#f7f8fa', borderRadius: 8, padding: '0.4rem 0.8rem', marginBottom: 3, fontSize: '0.98rem' }}>
                  <span style={{ color: '#4f8cff', fontWeight: 600 }}>Public:</span> {c}
                </div>
              ))}
            </div>
          )} */}
        </div>
      ))}
      {hasMore && <div className="loading-feed">Loading more...</div>}
    </div>
  );

  // Notification tab
  const [showNotif, setShowNotif] = useState(false);
  const handleNotifClick = () => {
    setShowNotif(true);
    setLastSeen(Date.now());
  };

  // In the main render, show like notifications for celebrity
  return (
    <div className="app-container">
      <header className="app-header">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: 12 }}>
          <h1 style={{
            fontFamily: 'Montserrat, sans-serif',
            fontWeight: 800,
            fontSize: '2.5rem',
            letterSpacing: '0.08em',
            background: 'linear-gradient(90deg, #fc575e 0%, #f7b42c 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            textShadow: '0 2px 16px rgba(252,87,94,0.12)',
            borderRadius: 12,
            padding: '0.2em 0.7em',
            boxShadow: '0 2px 12px 0 rgba(247,180,44,0.08)',
            margin: 0
          }}>Socio.ly</h1>
        </div>
        {pageView === 'login' && (
          <div className="login-page">
            <div className="login-card">
              <h2>Welcome!</h2>
              <p className="login-desc">Sign in to join the conversation as a <b>Celebrity</b> or <b>Public</b> user.</p>
              <div className="login-btn-group">
                <button onClick={() => handleLogin(dummyCeleb)} className="login-btn celeb-login">
                  <span role="img" aria-label="star">🌟</span> Login as Celebrity
                </button>
                <button onClick={() => handleLogin(dummyPublic)} className="login-btn public-login">
                  <span role="img" aria-label="user">👤</span> Login as Public
                </button>
              </div>
             <div className="login-hint">No signup needed. Just click to enter as a demo user!</div>
            </div>
          </div>
        )}
        {pageView === 'feed' && user && user.role === 'public' && (
          <button className="celeb-btn" onClick={() => setShowCelebTab(true)}>
            Browse Celebrities
          </button>
        )}
        {pageView === 'feed' && user && user.role === 'public' && (
          <button className="notif-btn" onClick={handleNotifClick}>
            Notifications {newPostsCount > 0 && <span className="notif-badge">{newPostsCount}</span>}
          </button>
        )}
        {pageView === 'feed' && user && (
          <div style={{ margin: '1rem 0' }}>
            <span>Logged in as <b>{user.name}</b> ({user.role})</span>
            <button onClick={handleLogout} className="logout-btn" style={{ marginLeft: 12 }}>Logout</button>
          </div>
        )}
        {/* {pageView === 'feed' && user && user.role === 'celebrity' && likeNotifs.length > 0 && (
          <div className="notif-tab" style={{ background: '#fffbe7', color: '#fc575e', margin: '1rem auto', maxWidth: 420 }}>
            <h3>Like Notifications</h3>
            {likeNotifs.map((notif, i) => (
              <div key={notif.postId + notif.timestamp + i} style={{ marginBottom: 6 }}>
                Your post was liked {notif.count} time{notif.count > 1 ? 's' : ''}! <span style={{ color: '#888', fontSize: '0.95em' }}>{new Date(notif.timestamp).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        )} */}
        <p>{pageView === 'login'}</p>
      </header>
      <main>
        {pageView === 'feed' && (
          <>
            {showCelebTab && renderCelebTab()}
            {showNotif && (
              <div className="notif-tab">
                <h3>Notifications</h3>
                {newPostsCount === 0 ? <div>No new posts.</div> : <div>You have {newPostsCount} new post(s)!</div>}
                <button onClick={() => setShowNotif(false)} className="close-notif">Close</button>
              </div>
            )}
            {user && user.role === 'celebrity' && (
              <div className="create-post">
                <textarea
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder="What's on your mind?"
                  rows={3}
                />
                <input type="file" accept="image/*" onChange={handleImageChange} />
                <button onClick={handleCreatePost} className="post-btn">Post</button>
              </div>
            )}
            {renderFeed()}
          </>
        )}
      </main>
    </div>
  );
}

export default App;
