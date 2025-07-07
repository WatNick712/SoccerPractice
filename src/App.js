import React, { useState, useEffect, useRef, useCallback } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import './App.css';
import { db, auth, googleProvider, teamsCollection, storage, storageRef } from './firebase';
import { collection, doc, setDoc, addDoc, getDocs, deleteDoc, query, where, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc as firestoreDoc, setDoc as firestoreSetDoc, getDoc as firestoreGetDoc, collection as firestoreCollection } from 'firebase/firestore';
import { uploadBytes, getDownloadURL } from 'firebase/storage';

// Default categories for new teams
const CATEGORIES_DEFAULT = [
  'Conditioning', 'Defending', 'Finishing', 'Indoor Gym', 'Overloads', 'Passing',
  'Possession', 'Position and Shape', 'Pressing', 'Scanning', 'Transition', 'Warmup', 'Water Break'
];

// Sortable pill component for drills
function SortableDrillPill({ id, name, duration, description, listeners, attributes, setNodeRef, style, isDragging, onRemove, onDuplicate, timeRange, link, note, editingNoteDrillId, setEditingNoteDrillId, noteInput, setNoteInput, handleSaveDrillNote, categories, rank, idx, customDuration, editingDurationKey, setEditingDurationKey, durationInput, setDurationInput, handleSaveDrillDuration, images, setImageModalUrl, setImageModalOpen }) {
  const isEditing = editingNoteDrillId === idx;
  const drillDuration = customDuration != null ? customDuration : duration;
  const isEditingDuration = editingDurationKey === idx;
  return (
    <div
      ref={setNodeRef}
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '0.5rem 1rem',
        margin: 0,
        background: isDragging ? '#1976d2' : '#eee',
        color: isDragging ? '#fff' : '#222',
        borderRadius: '999px',
        boxShadow: isDragging ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
        fontWeight: 'bold',
        cursor: isDragging ? 'grabbing' : 'default',
        flexWrap: 'wrap',
        ...style,
      }}
    >
      {/* Drag handle */}
      <span
        {...attributes}
        {...listeners}
        style={{
          cursor: 'grab',
          marginRight: 12,
          fontSize: '1.2em',
          userSelect: 'none',
          display: 'flex',
          alignItems: 'center',
        }}
        tabIndex={0}
        aria-label="Drag to reorder"
      >
        ≡
      </span>
      <div style={{ flex: 1 }}>
        {name} ({drillDuration} min)
        {timeRange && (
          <span style={{ marginLeft: 12, fontWeight: 'normal', fontSize: '0.95em' }}>
            {formatTime12h(timeRange.start)} – {formatTime12h(timeRange.end)}
          </span>
        )}
        <LinkIcon url={link} />
        <DrillImageGallery images={images} onClick={url => { setImageModalUrl(url); setImageModalOpen(true); }} />
        <br />
        <span style={{ fontWeight: 'normal', fontSize: '0.95em', color: '#444' }}>{description}</span>
        {renderStars(rank || 3)}
        {Array.isArray(categories) && categories.length > 0 && (
          <span style={{ marginLeft: 8 }}>
            {categories.map(cat => (
              <span key={cat} style={{ background: '#e0e0e0', color: '#333', borderRadius: 8, padding: '2px 8px', marginRight: 4, fontSize: '0.85em' }}>{cat}</span>
            ))}
          </span>
        )}
        <br />
        {isEditing ? (
          <span>
            <input
              type="text"
              value={noteInput}
              onChange={e => setNoteInput(e.target.value)}
              style={{ marginTop: 4, marginRight: 4, borderRadius: 6, border: '1px solid #ccc', padding: '2px 6px', fontSize: '0.95em' }}
              placeholder="Add note..."
            />
            <button onClick={() => handleSaveDrillNote(noteInput)} style={{ marginRight: 4, fontSize: '0.95em' }}>💾</button>
            <button onClick={() => { setEditingNoteDrillId(null); setNoteInput(''); }} style={{ fontSize: '0.95em' }}>✖</button>
          </span>
        ) : (
          <span style={{ marginTop: 4, display: 'inline-block', fontWeight: 'normal', fontSize: '0.95em' }}>
            {note && (
              <span>
                📝 {note}
                <button onClick={() => { setEditingNoteDrillId(idx); setNoteInput(note || ''); }} style={{ fontSize: '0.95em', marginLeft: 4 }}>✏️</button>
                <button onClick={() => handleSaveDrillNote('')} style={{ fontSize: '0.95em', marginLeft: 4 }}>🗑️</button>
              </span>
            )}
            {!note && (
              <button onClick={() => { setEditingNoteDrillId(idx); setNoteInput(note || ''); }} style={{ fontSize: '0.95em', marginLeft: 4 }}>✏️</button>
            )}
          </span>
        )}
        {isEditingDuration ? (
          <span>
            <input
              type="number"
              min="1"
              value={durationInput}
              onChange={e => setDurationInput(e.target.value)}
              style={{ width: 50, marginLeft: 8, marginRight: 4, borderRadius: 6, border: '1px solid #ccc', padding: '2px 6px', fontSize: '0.95em' }}
            />
            <button onClick={() => handleSaveDrillDuration(idx, durationInput)} style={{ marginRight: 4, fontSize: '0.95em' }}>💾</button>
            <button onClick={() => { setEditingDurationKey(null); setDurationInput(''); }} style={{ fontSize: '0.95em' }}>✖</button>
          </span>
        ) : (
          <span style={{ marginLeft: 8 }}>
            <span>{drillDuration} min</span>
            <button onClick={() => { setEditingDurationKey(idx); setDurationInput((customDuration != null ? customDuration : duration).toString()); }} style={{ fontSize: '0.95em', marginLeft: 4 }}>⏰</button>
          </span>
        )}
      </div>
      <button onClick={() => onRemove()} style={{ marginLeft: 8, background: '#c00', color: '#fff', border: 'none', borderRadius: '50%', width: 22, height: 22, cursor: 'pointer', fontWeight: 'bold' }}>×</button>
      <button onClick={onDuplicate} style={{ marginLeft: 8, background: '#1976d2', color: '#fff', border: 'none', borderRadius: '50%', width: 22, height: 22, cursor: 'pointer', fontWeight: 'bold' }}>⧉</button>
    </div>
  );
}

function DraggableDrillPills(props) {
  const {
    assignedDrills,
    assignedDrillIndices = [],
    onReorder,
    onRemove,
    onDuplicate,
    sessionStartTime,
    getDrillNote,
    editingNoteDrillId,
    setEditingNoteDrillId,
    noteInput,
    setNoteInput,
    handleSaveDrillNote,
    editingDurationKey,
    setEditingDurationKey,
    durationInput,
    setDurationInput,
    handleSaveDrillDuration,
    setImageModalUrl,
    setImageModalOpen,
  } = props;
  // Calculate time ranges for each drill
  let runningTime = sessionStartTime;
  const timeRanges = assignedDrills.map((drill) => {
    const duration = drill.customDuration != null ? drill.customDuration : drill.duration;
    const start = runningTime;
    const end = addMinutesToTime(start, duration || 0);
    runningTime = end;
    return { start, end };
  });
  return (
    <DndContext
      collisionDetection={closestCenter}
      onDragEnd={event => {
        const { active, over } = event;
        if (active.id !== over.id) {
          const oldIndex = assignedDrills.findIndex((_, idx) => `${assignedDrills[idx].id}-${idx}` === active.id);
          const newIndex = assignedDrills.findIndex((_, idx) => `${assignedDrills[idx].id}-${idx}` === over.id);
          const newAssignments = [...assignedDrills];
          const [moved] = newAssignments.splice(oldIndex, 1);
          newAssignments.splice(newIndex, 0, moved);
          onReorder(newAssignments);
        }
      }}
    >
      <SortableContext items={assignedDrills.map((_, idx) => `${assignedDrills[idx].id}-${idx}`)} strategy={verticalListSortingStrategy}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: 12 }}>
          {assignedDrills.map((drill, idx) => (
            <SortableDrillPillWrapper
              key={`${drill.id}-${idx}`}
              drill={drill}
              onRemove={() => onRemove(assignedDrillIndices[idx])}
              onDuplicate={() => onDuplicate(assignedDrillIndices[idx])}
              timeRange={timeRanges[idx]}
              note={getDrillNote(drill.id, idx)}
              editingNoteDrillId={editingNoteDrillId}
              setEditingNoteDrillId={setEditingNoteDrillId}
              noteInput={noteInput}
              setNoteInput={setNoteInput}
              handleSaveDrillNote={(note) => handleSaveDrillNote(idx, note)}
              categories={drill.categories}
              rank={drill.rank}
              idx={idx}
              dndId={`${drill.id}-${idx}`}
              customDuration={drill.customDuration}
              editingDurationKey={editingDurationKey}
              setEditingDurationKey={setEditingDurationKey}
              durationInput={durationInput}
              setDurationInput={setDurationInput}
              handleSaveDrillDuration={handleSaveDrillDuration}
              images={drill.images}
              setImageModalUrl={setImageModalUrl}
              setImageModalOpen={setImageModalOpen}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function SortableDrillPillWrapper(props) {
  const { drill, timeRange, note, editingNoteDrillId, setEditingNoteDrillId, noteInput, setNoteInput, handleSaveDrillNote, idx, dndId, customDuration, editingDurationKey, setEditingDurationKey, durationInput, setDurationInput, handleSaveDrillDuration, images, setImageModalUrl, setImageModalOpen } = props;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: dndId });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 2 : 1,
  };
  const drillDuration = customDuration != null ? customDuration : drill.duration;
  return (
    <SortableDrillPill
      id={drill.id}
      name={drill.name}
      duration={drillDuration}
      description={drill.description}
      listeners={listeners}
      attributes={attributes}
      setNodeRef={setNodeRef}
      style={style}
      isDragging={isDragging}
      onRemove={props.onRemove}
      onDuplicate={props.onDuplicate}
      timeRange={timeRange}
      link={drill.link}
      note={note}
      editingNoteDrillId={editingNoteDrillId}
      setEditingNoteDrillId={setEditingNoteDrillId}
      noteInput={noteInput}
      setNoteInput={setNoteInput}
      handleSaveDrillNote={handleSaveDrillNote}
      categories={drill.categories}
      rank={drill.rank}
      idx={idx}
      customDuration={customDuration}
      editingDurationKey={editingDurationKey}
      setEditingDurationKey={setEditingDurationKey}
      durationInput={durationInput}
      setDurationInput={setDurationInput}
      handleSaveDrillDuration={handleSaveDrillDuration}
      images={images}
      setImageModalUrl={setImageModalUrl}
      setImageModalOpen={setImageModalOpen}
    />
  );
}

// Helper to format 24-hour time to 12-hour AM/PM
function formatTime12h(timeStr) {
  if (!timeStr) return '';
  const [hour, minute] = timeStr.split(':').map(Number);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${minute.toString().padStart(2, '0')} ${ampm}`;
}

// Helper to add minutes to a time string (HH:mm) and return new time string
function addMinutesToTime(timeStr, minutesToAdd) {
  if (!timeStr) return '';
  const [hour, minute] = timeStr.split(':').map(Number);
  const date = new Date(0, 0, 0, hour, minute + minutesToAdd);
  const h = date.getHours();
  const m = date.getMinutes();
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

// Add a link icon component
function LinkIcon({ url }) {
  if (!url) return null;
  let icon = '🔗';
  if (url.includes('youtube.com') || url.includes('youtu.be')) icon = '▶️';
  if (url.includes('facebook.com')) icon = '📘';
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" style={{ marginLeft: 8, textDecoration: 'none', fontSize: '1.2em' }} title={url}>
      {icon}
    </a>
  );
}

function renderStars(rank) {
  return (
    <span style={{ color: '#f5b301', marginLeft: 4 }}>
      {'★'.repeat(rank)}{'☆'.repeat(5 - rank)}
    </span>
  );
}

// Soccer ball image progress for calendar
function SoccerBallImageProgress({ percent }) {
  const size = 32;
  const fillHeight = percent >= 1 ? size : size * percent;
  return (
    <div style={{ position: 'relative', width: size, height: size, margin: '0 auto' }}>
      <div style={{
        position: 'absolute',
        top: 0, left: 0, width: size, height: size,
        backgroundImage: 'url(/soccer-ball.png)',
        backgroundSize: 'cover',
        borderRadius: '50%',
        filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.10))',
      }} />
      {percent > 0 && (
        <div style={{
          position: 'absolute',
          left: 0,
          bottom: 0,
          width: size,
          height: fillHeight,
          background: 'rgba(76, 175, 80, 0.7)',
          borderRadius: '0 0 50% 50% / 0 0 100% 100%',
          zIndex: 2,
          transition: 'height 0.3s',
          pointerEvents: 'none',
        }} />
      )}
    </div>
  );
}

function App() {
  // All hooks at the top level
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [teamModalOpen, setTeamModalOpen] = useState(false);
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [teamNameInput, setTeamNameInput] = useState('');
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [teamLoading, setTeamLoading] = useState(false);
  const [membersModalOpen, setMembersModalOpen] = useState(false);
  const [date, setDate] = useState(new Date());
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ location: '', start: '', end: '', objective: '' });
  const [sessions, setSessions] = useState({});
  const [drills, setDrills] = useState([]);
  const [drillLoading, setDrillLoading] = useState(false);
  const [editingNoteDrillId, setEditingNoteDrillId] = useState(null);
  const [noteInput, setNoteInput] = useState('');
  const [drillCategoryFilter, setDrillCategoryFilter] = useState('');
  const [drillRankFilter, setDrillRankFilter] = useState(1);
  const [drillNameFilter, setDrillNameFilter] = useState('');
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templates, setTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [addBtnAnimIdx, setAddBtnAnimIdx] = useState(null);
  const [editingDurationKey, setEditingDurationKey] = useState(null);
  const [durationInput, setDurationInput] = useState('');
  const [drillListNameFilter, setDrillListNameFilter] = useState('');
  const [drillListCategoryFilter, setDrillListCategoryFilter] = useState('');
  const [drillListRankFilter, setDrillListRankFilter] = useState(1);
  const [drillSectionOpen, setDrillSectionOpen] = useState(false);
  const [templateSectionOpen, setTemplateSectionOpen] = useState(false);
  const [drillModalOpen, setDrillModalOpen] = useState(false);
  const [drillForm, setDrillForm] = useState({ name: '', description: '', duration: '', link: '', categories: [], rank: 3, images: [] });
  const [addCategoryModalOpen, setAddCategoryModalOpen] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [addCategoryError, setAddCategoryError] = useState('');
  const [manageCategoriesModalOpen, setManageCategoriesModalOpen] = useState(false);
  const [categoryOrder, setCategoryOrder] = useState([]);
  const [categoryDeleteError, setCategoryDeleteError] = useState('');
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [imageModalUrl, setImageModalUrl] = useState('');
  // Add state for GK drill checkbox in session modal
  const [gkDrillCheckboxes, setGKDrillCheckboxes] = useState({});
  // Add state for session view filter
  const [sessionViewFilter, setSessionViewFilter] = useState('both');

  const sessionInfoRef = useRef(null);

  // Track the currently visible month in the calendar
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  // Helper to get first and last day of month
  function getMonthRange(date) {
    const first = new Date(date.getFullYear(), date.getMonth(), 1);
    const last = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    return { first, last };
  }

  // Fetch all sessions for the selected team for the visible month
  useEffect(() => {
    if (!selectedTeam || !calendarMonth) {
      setSessions({});
      return;
    }
    const fetchSessionsForMonth = async () => {
      const { first, last } = getMonthRange(calendarMonth);
      // Firestore does not support range queries on strings, so store date as ISO string (yyyy-mm-dd) or use timestamps for best results.
      // Here, we use toDateString() so we need to fetch all and filter in JS.
      const q = query(collection(db, 'sessions'), where('teamId', '==', selectedTeam.id));
      const querySnapshot = await getDocs(q);
      const sessionsByDate = {};
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        // Parse the date string to a Date object
        const sessionDate = new Date(data.date);
        if (sessionDate >= first && sessionDate <= last) {
          sessionsByDate[data.date] = { ...data, id: docSnap.id };
        }
      });
      setSessions(sessionsByDate);
    };
    fetchSessionsForMonth();
  }, [selectedTeam, calendarMonth]);

  // useCallback for fetchUserTeams to fix useEffect dependency
  const fetchUserTeams = useCallback(async (userId) => {
    setTeamLoading(true);
    const q = query(teamsCollection, where('members', 'array-contains', userId));
    const snapshot = await getDocs(q);
    const userTeams = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setTeams(userTeams);
    setTeamLoading(false);
    if (userTeams.length > 0 && !selectedTeam) {
      setSelectedTeam(userTeams[0]);
    }
  }, [selectedTeam]);

  useEffect(() => {
    if (user) {
      fetchUserTeams(user.uid);
    } else {
      setTeams([]);
      setSelectedTeam(null);
    }
  }, [user, fetchUserTeams]);

  // Ensure selectedTeam is set if there are teams and none is selected
  useEffect(() => {
    if (!selectedTeam && teams.length > 0) {
      setSelectedTeam(teams[0]);
    }
  }, [teams, selectedTeam]);

  // Fetch drills from Firestore
  useEffect(() => {
    if (!selectedTeam) {
      setDrills([]);
      return;
    }
    const fetchDrills = async () => {
      setDrillLoading(true);
      const q = query(collection(db, 'drills'), where('teamId', '==', selectedTeam.id));
      const querySnapshot = await getDocs(q);
      const drillsList = [];
      querySnapshot.forEach((doc) => {
        drillsList.push({ id: doc.id, ...doc.data() });
      });
      setDrills(drillsList);
      setDrillLoading(false);
    };
    fetchDrills();
  }, [selectedTeam]);

  // Sync form and drill selection with session data for the selected date
  useEffect(() => {
    const sessionData = sessions[date.toDateString()];
    if (sessionData) {
      setForm({
        location: sessionData.location || '',
        start: sessionData.start || '',
        end: sessionData.end || '',
        objective: sessionData.objective || '',
      });
    } else {
      setForm({ location: '', start: '', end: '', objective: '' });
    }
  }, [date, sessions]);

  // Fetch templates from Firestore, scoped to selected team
  useEffect(() => {
    if (!selectedTeam) {
      setTemplates([]);
      return;
    }
    const fetchTemplates = async () => {
      setLoadingTemplates(true);
      const q = query(collection(db, 'sessionTemplates'), where('teamId', '==', selectedTeam.id));
      const querySnapshot = await getDocs(q);
      const templateList = [];
      querySnapshot.forEach((doc) => {
        templateList.push({ id: doc.id, ...doc.data() });
      });
      setTemplates(templateList);
      setLoadingTemplates(false);
    };
    fetchTemplates();
  }, [selectedTeam]);

  const [showSessionDetails, setShowSessionDetails] = useState(false);

  const handleDateClick = (value) => {
    setDate(value);
    const sessionForDate = sessions[value.toDateString()];
    if (sessionForDate) {
      setShowSessionDetails(true);
      setTimeout(() => {
        if (sessionInfoRef.current) {
          sessionInfoRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
      setModalOpen(false);
    } else {
    setModalOpen(true);
      setShowSessionDetails(false);
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Add a drill instance to the session, creating the session if it doesn't exist
  const handleAddDrillInstance = async (drillId, idx, isGoalKeeper = false) => {
    setAddBtnAnimIdx(idx);
    setTimeout(() => setAddBtnAnimIdx(null), 350);
    let currentSession = session;
    if (!currentSession) {
      currentSession = {
        location: form.location || '',
        start: form.start || '',
        end: form.end || '',
        totalMinutes: form.start && form.end ? (() => {
          const s = form.start.split(':');
          const e = form.end.split(':');
          return (parseInt(e[0], 10) * 60 + parseInt(e[1], 10)) - (parseInt(s[0], 10) * 60 + parseInt(s[1], 10));
        })() : 0,
        drillAssignments: [],
        teamId: selectedTeam.id,
        date: date.toDateString(),
        objective: form.objective || '',
      };
    }
    const newAssignments = [
      ...(currentSession.drillAssignments ? currentSession.drillAssignments : []),
      { id: drillId, note: '', isGoalKeeper },
    ];
    const updatedSession = { ...currentSession, drillAssignments: newAssignments };
    let sessionDocId = currentSession.id;
    if (!sessionDocId) {
      // Find if a session already exists for this team/date
      const q = query(collection(db, 'sessions'), where('teamId', '==', selectedTeam.id), where('date', '==', date.toDateString()));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        sessionDocId = querySnapshot.docs[0].id;
      }
    }
    if (sessionDocId) {
      await setDoc(doc(collection(db, 'sessions'), sessionDocId), updatedSession);
      setSessions((prev) => ({
        ...prev,
        [date.toDateString()]: { ...updatedSession, id: sessionDocId },
      }));
    } else {
      const docRef = await addDoc(collection(db, 'sessions'), updatedSession);
      setSessions((prev) => ({
        ...prev,
        [date.toDateString()]: { ...updatedSession, id: docRef.id },
      }));
    }
  };

  // Save session (merge form values with existing session, keep drillAssignments)
  const handleSubmit = async (e) => {
    e.preventDefault();
    const start = form.start.split(':');
    const end = form.end.split(':');
    const startMinutes = parseInt(start[0], 10) * 60 + parseInt(start[1], 10);
    const endMinutes = parseInt(end[0], 10) * 60 + parseInt(end[1], 10);
    const totalMinutes = endMinutes - startMinutes;
    const updatedSession = {
      ...session,
      location: form.location,
      start: form.start,
      end: form.end,
      totalMinutes,
      drillAssignments: (session && session.drillAssignments) ? session.drillAssignments : [],
      teamId: selectedTeam.id,
      date: date.toDateString(),
      objective: form.objective || '',
    };
    let sessionDocId = session && session.id;
    if (!sessionDocId) {
      // Find if a session already exists for this team/date
      const q = query(collection(db, 'sessions'), where('teamId', '==', selectedTeam.id), where('date', '==', date.toDateString()));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        sessionDocId = querySnapshot.docs[0].id;
      }
    }
    if (sessionDocId) {
      await setDoc(doc(collection(db, 'sessions'), sessionDocId), updatedSession);
      setSessions((prev) => ({
        ...prev,
        [date.toDateString()]: { ...updatedSession, id: sessionDocId },
      }));
    } else {
      const docRef = await addDoc(collection(db, 'sessions'), updatedSession);
      setSessions((prev) => ({
        ...prev,
        [date.toDateString()]: { ...updatedSession, id: docRef.id },
      }));
    }
    setModalOpen(false);
  };

  const handleDeleteDrill = async (id) => {
    await deleteDoc(doc(db, 'drills', id));
    setDrills(drills.filter((drill) => drill.id !== id));
  };

  // FIX: Define session before using it
  const session = sessions[date.toDateString()];

  // Use customDuration for assignedDrills
  const assignedDrills = session && session.drillAssignments
    ? session.drillAssignments.map((a) => {
        const drill = drills.find((d) => d.id === a.id);
        return drill ? { ...drill, ...a } : null;
      }).filter(Boolean)
    : [];
  // Build fieldDrills and gkDrills with their indices in assignedDrills
  const fieldDrillIndices = [];
  const fieldDrills = [];
  const gkDrillIndices = [];
  const gkDrills = [];
  assignedDrills.forEach((d, i) => {
    if (!d.isGoalKeeper) {
      fieldDrills.push(d);
      fieldDrillIndices.push(i);
    } else {
      gkDrills.push(d);
      gkDrillIndices.push(i);
    }
  });
  // Use customDuration for totalDrillTime
  const totalDrillTime = fieldDrills.reduce((sum, d) => sum + (d.customDuration != null ? d.customDuration : d.duration || 0), 0);
  const totalGKDrillTime = gkDrills.reduce((sum, d) => sum + (d.customDuration != null ? d.customDuration : d.duration || 0), 0);
  const timeLeft = session ? (session.totalMinutes - totalDrillTime) : 0;

  // Save current session as template
  const handleSaveAsTemplate = async () => {
    setTemplateModalOpen(true);
    setTemplateName('');
  };

  const handleConfirmSaveTemplate = async () => {
    if (!templateName || !session) return;
    const templateData = {
      name: templateName,
      session: session,
      createdAt: new Date().toISOString(),
      teamId: selectedTeam.id,
    };
    const docRef = await addDoc(collection(db, 'sessionTemplates'), templateData);
    setTemplates([...templates, { id: docRef.id, ...templateData }]);
    setTemplateModalOpen(false);
    setTemplateName('');
  };

  // Apply a template to the current date
  const handleApplyTemplate = async (template) => {
    // Prepare session data for the selected team and date
    const sessionData = {
      ...template.session,
      teamId: selectedTeam.id,
      date: date.toDateString(),
    };
    // Add as a new document in Firestore
    const docRef = await addDoc(collection(db, 'sessions'), sessionData);
    setSessions((prev) => ({
      ...prev,
      [date.toDateString()]: { ...sessionData, id: docRef.id },
    }));
  };

  // Delete session logic
  const handleDeleteSession = async () => {
    if (!window.confirm('Are you sure you want to delete this session?')) return;
    await deleteDoc(doc(collection(db, 'sessions'), session.id));
    setSessions((prev) => {
      const newSessions = { ...prev };
      delete newSessions[date.toDateString()];
      return newSessions;
    });
    setShowSessionDetails(false);
  };

  const clearDrillFilters = () => {
    setDrillNameFilter('');
    setDrillCategoryFilter('');
    setDrillRankFilter(1);
  };

  // Remove a drill instance by index
  const handleRemoveDrillInstance = async (idx) => {
    const newAssignments = [...(session.drillAssignments || [])];
    newAssignments.splice(idx, 1);
    const updatedSession = { ...session, drillAssignments: newAssignments };
    await setDoc(doc(collection(db, 'sessions'), session.id), updatedSession);
    setSessions((prev) => ({
      ...prev,
      [date.toDateString()]: { ...updatedSession, id: session.id },
    }));
  };

  // Update note for a drill instance by index
  const handleSaveDrillInstanceNote = async (idx, note) => {
    const newAssignments = [...(session.drillAssignments || [])];
    newAssignments[idx] = { ...newAssignments[idx], note };
    const updatedSession = { ...session, drillAssignments: newAssignments };
    await setDoc(doc(collection(db, 'sessions'), session.id), updatedSession);
    setSessions((prev) => ({
      ...prev,
      [date.toDateString()]: { ...updatedSession, id: session.id },
    }));
  };

  // Drag-and-drop reorder for drill instances
  const handleReorderDrills = async (newAssignments) => {
    // Only keep assignment fields (id, note, customDuration, etc.), not the full drill object
    const cleanedAssignments = newAssignments.map(d => {
      const { id, note, customDuration } = d;
      const assignment = { id };
      if (note !== undefined) assignment.note = note;
      if (customDuration !== undefined) assignment.customDuration = customDuration;
      return assignment;
    });
    const updatedSession = { ...session, drillAssignments: cleanedAssignments };
    await setDoc(doc(collection(db, 'sessions'), session.id), updatedSession);
    setSessions((prev) => ({
      ...prev,
      [date.toDateString()]: { ...updatedSession, id: session.id },
    }));
  };

  // Save custom duration for a drill instance by index
  const handleSaveDrillDuration = async (idx, minutes) => {
    const newAssignments = [...(session.drillAssignments || [])];
    newAssignments[idx] = { ...newAssignments[idx], customDuration: parseInt(minutes, 10) };
    const updatedSession = { ...session, drillAssignments: newAssignments };
    await setDoc(doc(collection(db, 'sessions'), session.id), updatedSession);
    setSessions((prev) => ({
      ...prev,
      [date.toDateString()]: { ...updatedSession, id: session.id },
    }));
    setEditingDurationKey(null);
    setDurationInput('');
  };

  // Delete a template by id
  const handleDeleteTemplate = async (id) => {
    if (!window.confirm('Are you sure you want to delete this template?')) return;
    await deleteDoc(doc(collection(db, 'sessionTemplates'), id));
    setTemplates(templates.filter(t => t.id !== id));
  };

  // Helper for calendar tile content
  const calendarTileContent = ({ date: calDate, view }) => {
    // Debug: print session keys and current calendar month
    if (view === 'month' && calDate.getDate() === 1) {
      console.log('Calendar month:', calendarMonth.toDateString());
      console.log('Session keys:', Object.keys(sessions));
    }
    if (view === 'month' && sessions[calDate.toDateString()]) {
      const session = sessions[calDate.toDateString()];
      const total = session.totalMinutes || 0;
      let planned = 0;
      if (session.drillAssignments && Array.isArray(session.drillAssignments)) {
        planned = session.drillAssignments.reduce((sum, d) => {
          const drill = drills.find(dr => dr.id === d.id);
          const duration = d.customDuration != null ? d.customDuration : (drill ? drill.duration : 0);
          return sum + (duration || 0);
        }, 0);
      }
      console.log('[CAL TILE]', calDate.toDateString(), { session, total, planned });
      // Only show icon if session has drills and total > 0
      if (planned > 0 && total > 0) {
        let percent;
        if (planned >= total) {
          percent = 1;
      } else {
          percent = planned / total;
          if (percent < 0) percent = 0;
      }
      return <SoccerBallImageProgress percent={percent} />;
      }
    }
    return null;
  };

  const handleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      alert('Sign in failed: ' + err.message);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      alert('Sign out failed: ' + err.message);
    }
  };

  const clearDrillListFilters = () => {
    setDrillListNameFilter('');
    setDrillListCategoryFilter('');
    setDrillListRankFilter(1);
  };

  const filteredDrillList = drills.filter(drill => {
    const categoryMatch = !drillListCategoryFilter || (drill.categories && drill.categories.includes(drillListCategoryFilter));
    const rankMatch = (drill.rank || 3) >= drillListRankFilter;
    const nameMatch = !drillListNameFilter || (drill.name && drill.name.toLowerCase().includes(drillListNameFilter.toLowerCase()));
    return categoryMatch && rankMatch && nameMatch;
  });
  const filteredDrills = drills.filter(drill => {
    const categoryMatch = !drillCategoryFilter || (drill.categories && drill.categories.includes(drillCategoryFilter));
    const rankMatch = (drill.rank || 3) >= drillRankFilter;
    const nameMatch = !drillNameFilter || (drill.name && drill.name.toLowerCase().includes(drillNameFilter.toLowerCase()));
    return categoryMatch && rankMatch && nameMatch;
  });

  // Restore handleCreateTeam and handleJoinTeam at the top level
  const handleCreateTeam = async () => {
    if (!teamNameInput || !user) return;
    setTeamLoading(true);
    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const newTeam = {
      name: teamNameInput,
      createdBy: user.uid,
      members: [user.uid],
      inviteCode,
      createdAt: new Date().toISOString(),
      categories: CATEGORIES_DEFAULT,
    };
    const docRef = await addDoc(teamsCollection, newTeam);
    setTeams([...teams, { id: docRef.id, ...newTeam }]);
    setSelectedTeam({ id: docRef.id, ...newTeam });
    setTeamModalOpen(false);
    setTeamNameInput('');
    setTeamLoading(false);
  };

  const handleJoinTeam = async () => {
    if (!inviteCodeInput || !user) return;
    setTeamLoading(true);
    const q = query(teamsCollection, where('inviteCode', '==', inviteCodeInput.toUpperCase()));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      alert('No team found with that invite code.');
      setTeamLoading(false);
      return;
    }
    const teamDoc = snapshot.docs[0];
    const teamData = teamDoc.data();
    if (!teamData.members.includes(user.uid)) {
      await updateDoc(doc(teamsCollection, teamDoc.id), {
        members: arrayUnion(user.uid),
      });
    }
    setTeams([...teams, { id: teamDoc.id, ...teamData, members: [...teamData.members, user.uid] }]);
    setSelectedTeam({ id: teamDoc.id, ...teamData, members: [...teamData.members, user.uid] });
    setJoinModalOpen(false);
    setInviteCodeInput('');
    setTeamLoading(false);
  };

  // Firebase authentication listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Save user info to Firestore on sign-in
  useEffect(() => {
    if (user) {
      const saveUserInfo = async () => {
        const userRef = firestoreDoc(db, 'users', user.uid);
        await firestoreSetDoc(userRef, {
          displayName: user.displayName || '',
          email: user.email || '',
        }, { merge: true });
      };
      saveUserInfo();
    }
  }, [user]);

  // State for team member user info
  const [teamMemberInfos, setTeamMemberInfos] = useState([]);

  // Fetch user info for all team members when the modal opens
  useEffect(() => {
    const fetchTeamMemberInfos = async () => {
      if (membersModalOpen && selectedTeam && selectedTeam.members && selectedTeam.members.length > 0) {
        const usersCol = firestoreCollection(db, 'users');
        const userDocs = await Promise.all(selectedTeam.members.map(uid => firestoreGetDoc(firestoreDoc(usersCol, uid))));
        setTeamMemberInfos(userDocs.map(docSnap => docSnap.exists() ? { uid: docSnap.id, ...docSnap.data() } : { uid: docSnap.id }));
      } else {
        setTeamMemberInfos([]);
      }
    };
    fetchTeamMemberInfos();
  }, [membersModalOpen, selectedTeam]);

  const [teamCategories, setTeamCategories] = useState(CATEGORIES_DEFAULT);

  // When selectedTeam changes, update teamCategories
  useEffect(() => {
    if (selectedTeam && selectedTeam.categories && Array.isArray(selectedTeam.categories)) {
      setTeamCategories(selectedTeam.categories);
    } else {
      setTeamCategories(CATEGORIES_DEFAULT);
    }
  }, [selectedTeam]);

  // Add handler to add a new category
  const handleAddCategory = async () => {
    const newCat = newCategoryInput.trim();
    if (!newCat) {
      setAddCategoryError('Category name cannot be empty.');
      return;
    }
    if (teamCategories.some(cat => cat.toLowerCase() === newCat.toLowerCase())) {
      setAddCategoryError('Category already exists.');
      return;
    }
    try {
      const updatedCategories = [...teamCategories, newCat].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
      // Update Firestore
      await updateDoc(doc(teamsCollection, selectedTeam.id), { categories: updatedCategories });
      // Update local state
      setTeamCategories(updatedCategories);
      setSelectedTeam(prev => ({ ...prev, categories: updatedCategories }));
      setAddCategoryModalOpen(false);
      setNewCategoryInput('');
      setAddCategoryError('');
    } catch (err) {
      setAddCategoryError('Failed to add category.');
    }
  };

  // Open manage modal and initialize order
  const openManageCategoriesModal = () => {
    setCategoryOrder(teamCategories);
    setManageCategoriesModalOpen(true);
    setCategoryDeleteError('');
    setCategoryToDelete(null);
  };

  // Save reordered categories
  const handleSaveCategoryOrder = async () => {
    await updateDoc(doc(teamsCollection, selectedTeam.id), { categories: categoryOrder });
    setTeamCategories(categoryOrder);
    setSelectedTeam(prev => ({ ...prev, categories: categoryOrder }));
    setManageCategoriesModalOpen(false);
  };

  // Delete category (with check)
  const handleDeleteCategory = async (cat) => {
    // Check if any drill uses this category
    if (drills.some(drill => Array.isArray(drill.categories) && drill.categories.includes(cat))) {
      setCategoryDeleteError('Cannot delete: Category is used by a drill.');
      setCategoryToDelete(null);
      return;
    }
    const updated = categoryOrder.filter(c => c !== cat);
    await updateDoc(doc(teamsCollection, selectedTeam.id), { categories: updated });
    setTeamCategories(updated);
    setSelectedTeam(prev => ({ ...prev, categories: updated }));
    setCategoryOrder(updated);
    setCategoryDeleteError('');
    setCategoryToDelete(null);
  };

  // Add a function to remove team members
  const handleRemoveTeamMember = async (memberUid) => {
    if (!window.confirm('Are you sure you want to remove this team member?')) return;
    try {
      await updateDoc(doc(teamsCollection, selectedTeam.id), {
        members: arrayRemove(memberUid),
      });
      // Update local state
      setSelectedTeam(prev => ({
        ...prev,
        members: prev.members.filter(uid => uid !== memberUid)
      }));
      setTeams(prev => prev.map(team => 
        team.id === selectedTeam.id 
          ? { ...team, members: team.members.filter(uid => uid !== memberUid) }
          : team
      ));
    } catch (err) {
      alert('Failed to remove team member: ' + err.message);
    }
  };

  const handleDuplicateDrillInstance = async (idx) => {
    if (!session || !session.drillAssignments) return;
    const newAssignments = [...session.drillAssignments];
    const toDuplicate = { ...newAssignments[idx] };
    newAssignments.splice(idx + 1, 0, toDuplicate);
    const updatedSession = { ...session, drillAssignments: newAssignments };
    await setDoc(doc(collection(db, 'sessions'), session.id), updatedSession);
    setSessions((prev) => ({
      ...prev,
      [date.toDateString()]: { ...updatedSession, id: session.id },
    }));
  };

  if (authLoading) {
    return <div style={{ padding: 32, textAlign: 'center' }}>Loading authentication...</div>;
  }
  if (!user) {
    return (
      <div style={{
        minHeight: '100vh',
        width: '100vw',
        background: 'linear-gradient(135deg, #e3f0fb 0%, #f7faff 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{
          background: '#fff',
          borderRadius: 24,
          boxShadow: '0 8px 32px rgba(25, 118, 210, 0.12)',
          padding: '48px 36px 40px 36px',
          minWidth: 340,
          maxWidth: 380,
          width: '90vw',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}>
          <div style={{ marginBottom: 24 }}>
            <img src="/soccer-ball.png" alt="Soccer Ball" style={{ width: 64, height: 64, filter: 'drop-shadow(0 2px 8px rgba(25,118,210,0.10))' }} />
          </div>
          <h2 style={{ fontSize: '2.1em', fontWeight: 800, color: '#1976d2', margin: 0, marginBottom: 8, letterSpacing: '0.5px' }}>Soccer Planner</h2>
          <div style={{ fontSize: '1.1em', color: '#444', marginBottom: 32, textAlign: 'center', fontWeight: 500 }}>
            Plan, organize, and track your soccer practices.<br />Sign in to get started!
          </div>
          <button
            onClick={handleSignIn}
            style={{
              padding: '12px 32px',
              borderRadius: 8,
              border: 'none',
              background: '#fff',
              color: '#222',
              fontWeight: 'bold',
              fontSize: '1.15rem',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(25, 118, 210, 0.10)',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              transition: 'background 0.2s, color 0.2s',
              borderBottom: '3px solid #1976d2',
            }}
            onMouseOver={e => { e.target.style.background = '#e3f0fb'; }}
            onMouseOut={e => { e.target.style.background = '#fff'; }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" style={{ marginRight: 8 }}><g><path fill="#4285F4" d="M21.805 10.023h-9.765v3.977h5.617c-.242 1.242-1.484 3.648-5.617 3.648-3.375 0-6.125-2.789-6.125-6.148 0-3.359 2.75-6.148 6.125-6.148 1.922 0 3.211.82 3.953 1.523l2.703-2.633c-1.719-1.594-3.953-2.57-6.656-2.57-5.523 0-10 4.477-10 10s4.477 10 10 10c5.781 0 9.594-4.055 9.594-9.773 0-.656-.07-1.148-.164-1.477z"></path><path fill="#34A853" d="M3.153 7.345l3.281 2.406c.891-1.781 2.531-2.953 4.566-2.953 1.109 0 2.125.383 2.922 1.016l2.797-2.719c-1.484-1.367-3.406-2.094-5.719-2.094-3.672 0-6.75 2.484-7.844 5.844z"></path><path fill="#FBBC05" d="M12 22c2.438 0 4.484-.805 5.977-2.188l-2.781-2.273c-.781.523-1.781.836-3.195.836-2.484 0-4.594-1.68-5.352-3.953l-3.273 2.531c1.484 3.273 4.828 5.047 8.624 5.047z"></path><path fill="#EA4335" d="M21.805 10.023h-9.765v3.977h5.617c-.242 1.242-1.484 3.648-5.617 3.648-3.375 0-6.125-2.789-6.125-6.148 0-3.359 2.75-6.148 6.125-6.148 1.922 0 3.211.82 3.953 1.523l2.703-2.633c-1.719-1.594-3.953-2.57-6.656-2.57-5.523 0-10 4.477-10 10s4.477 10 10 10c5.781 0 9.594-4.055 9.594-9.773 0-.656-.07-1.148-.164-1.477z" opacity=".1"></path></g></svg>
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  // Always render the modals for team actions so they are accessible from the header
  const teamModals = <>
    {teamModalOpen && (
      <div className="modal-backdrop" style={{ zIndex: 10000 }}>
        <div className="modal" style={{ zIndex: 10001 }}>
          <h3>Create a Team</h3>
          <input type="text" value={teamNameInput} onChange={e => setTeamNameInput(e.target.value)} placeholder="Team Name" style={{ width: '100%', marginBottom: 12 }} />
          <button onClick={handleCreateTeam} disabled={teamLoading || !teamNameInput} style={{ marginRight: 8 }}>Create</button>
          <button onClick={() => setTeamModalOpen(false)}>Cancel</button>
        </div>
      </div>
    )}
    {joinModalOpen && (
      <div className="modal-backdrop" style={{ zIndex: 10000 }}>
        <div className="modal" style={{ zIndex: 10001 }}>
          <h3>Join a Team</h3>
          <input type="text" value={inviteCodeInput} onChange={e => setInviteCodeInput(e.target.value)} placeholder="Invite Code" style={{ width: '100%', marginBottom: 12 }} />
          <button onClick={handleJoinTeam} disabled={teamLoading || !inviteCodeInput} style={{ marginRight: 8 }}>Join</button>
          <button onClick={() => setJoinModalOpen(false)}>Cancel</button>
        </div>
      </div>
    )}
    {membersModalOpen && selectedTeam && (
      <div className="modal-backdrop" style={{ zIndex: 10000 }}>
        <div className="modal" style={{ zIndex: 10001 }}>
          <h3>Team Members</h3>
          <ul style={{ listStyle: 'none', padding: 0, marginBottom: 16 }}>
            {teamMemberInfos.length > 0 ? (
              teamMemberInfos.map((info, idx) => (
                <li key={info.uid} style={{ padding: '6px 0', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>
                    {info.displayName ? (
                      <span><strong>{info.displayName}</strong> <span style={{ color: '#888', fontSize: '0.95em' }}>({info.email})</span></span>
                    ) : (
                      <span>{info.uid}</span>
                    )}
                  </span>
                  {/* Show Remove button only if current user is creator and member is not the creator */}
                  {selectedTeam.createdBy === user.uid && info.uid !== selectedTeam.createdBy && (
                    <button
                      onClick={() => handleRemoveTeamMember(info.uid)}
                      style={{
                        background: '#c00',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 6,
                        padding: '4px 12px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        fontSize: '0.9em',
                      }}
                    >
                      Remove
                    </button>
                  )}
                </li>
              ))
            ) : (
              <li>No members found.</li>
            )}
          </ul>
          <div style={{ marginBottom: 12 }}>
            <strong>Invite Code:</strong> <span style={{ background: '#e3f0fb', padding: '4px 10px', borderRadius: 6, fontWeight: 500 }}>{selectedTeam.inviteCode}</span>
            <button
              style={{ marginLeft: 8, padding: '4px 12px', borderRadius: 6, border: '1.5px solid #1976d2', background: '#1976d2', color: '#fff', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.95em' }}
              onClick={() => { navigator.clipboard.writeText(selectedTeam.inviteCode); }}
            >
              Copy
            </button>
            <div style={{ fontSize: '0.95em', color: '#444', marginTop: 4 }}>
              Share this code with others to let them join your team.
            </div>
          </div>
          <button onClick={() => setMembersModalOpen(false)}>Close</button>
        </div>
      </div>
    )}
  </>;

  // Always render teamModals so modals can appear on top of the team setup modal
  if (teams.length === 0 || !selectedTeam) {
    return (
      <>
        {teamModals}
        <div className="modal-backdrop">
          <div className="modal" style={{ minWidth: 340 }}>
            <h2>Team Setup</h2>
            <p>To use Soccer Planner, you must create or join a team.</p>
            <button onClick={() => setTeamModalOpen(true)} style={{ margin: 8, padding: '8px 24px', borderRadius: 8, border: '1.5px solid #1976d2', background: '#1976d2', color: '#fff', fontWeight: 'bold', fontSize: '1.1em', cursor: 'pointer' }}>Create Team</button>
            <button onClick={() => setJoinModalOpen(true)} style={{ margin: 8, padding: '8px 24px', borderRadius: 8, border: '1.5px solid #1976d2', background: '#fff', color: '#1976d2', fontWeight: 'bold', fontSize: '1.1em', cursor: 'pointer' }}>Join Team</button>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="App" style={{ minHeight: '100vh', background: '#2d313a', display: 'flex', flexDirection: 'column' }}>
      {teamModals}
      {/* Only show session details panel when open, hide all other UI */}
      {session && showSessionDetails && !modalOpen ? (
        <div
          style={{
            minHeight: '100vh',
            width: '100vw',
            background: '#f7f7f7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'fixed',
            top: 0,
            left: 0,
            zIndex: 20000,
          }}
        >
          <div
            className="session-info"
            ref={sessionInfoRef}
            style={{
              background: '#fff',
              borderRadius: 16,
              boxShadow: '0 4px 24px rgba(25, 118, 210, 0.10)',
              padding: 32,
              maxWidth: 1200,
              minWidth: 600,
              width: '90vw',
              maxHeight: '90vh',
              overflowY: 'auto',
              position: 'relative',
              margin: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'stretch',
              paddingBottom: 180, // extra space for bottom bar and action buttons
            }}
          >
            <button
              onClick={() => setShowSessionDetails(false)}
              style={{ position: 'absolute', top: 24, right: 24, fontSize: '1.5rem', background: 'none', border: 'none', color: '#1976d2', cursor: 'pointer', fontWeight: 'bold' }}
              aria-label="Close session details"
            >
              ×
            </button>
            <h3>Session Details for {date.toDateString()}</h3>
            <p><strong>Location:</strong> {session.location}</p>
            <p><strong>Start Time:</strong> {formatTime12h(session.start)}</p>
            <p><strong>End Time:</strong> {formatTime12h(session.end)}</p>
            <p><strong>Total Minutes:</strong> {session.totalMinutes}</p>
            <p><strong>Total Drill Time:</strong> {totalDrillTime} min</p>
            <p><strong>Time Left in Session:</strong> {timeLeft} min</p>
            <p><strong>Objective:</strong> {session.objective || <span style={{ color: '#888' }}>No objective set</span>}</p>
            {/* Add Drills Button above the filter */}
            <button
              onClick={() => { setModalOpen(true); setShowSessionDetails(false); }}
              style={{ marginBottom: 12, padding: '8px 24px', borderRadius: 8, border: '1.5px solid #1976d2', background: '#1976d2', color: '#fff', fontWeight: 'bold', fontSize: '1.1em', cursor: 'pointer', boxShadow: '0 2px 6px rgba(25, 118, 210, 0.08)', transition: 'background 0.2s, color 0.2s' }}
              onMouseOver={e => { e.target.style.background = '#1251a3'; }}
              onMouseOut={e => { e.target.style.background = '#1976d2'; }}
            >
              Add Drills
            </button>
            {/* Session View Filter */}
            <div className="session-radio-group" style={{ margin: '16px 0 8px 0', display: 'flex', alignItems: 'center', gap: 16 }}>
              <span style={{ fontWeight: 500 }}>Show:</span>
              <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <input
                  type="radio"
                  name="sessionViewFilter"
                  value="both"
                  checked={sessionViewFilter === 'both'}
                  onChange={() => setSessionViewFilter('both')}
                />
                Both
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <input
                  type="radio"
                  name="sessionViewFilter"
                  value="field"
                  checked={sessionViewFilter === 'field'}
                  onChange={() => setSessionViewFilter('field')}
                />
                Field Only
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <input
                  type="radio"
                  name="sessionViewFilter"
                  value="gk"
                  checked={sessionViewFilter === 'gk'}
                  onChange={() => setSessionViewFilter('gk')}
                />
                Goal Keeper Only
              </label>
            </div>
            <div className="session-drill-columns" style={{ display: 'flex', gap: 32, marginTop: 16 }}>
              {(sessionViewFilter === 'both' || sessionViewFilter === 'field') && (
                <div style={{ flex: 1 }}>
                  <h4>Field Player Drills</h4>
                  <DraggableDrillPills
                    assignedDrills={fieldDrills}
                    assignedDrillIndices={fieldDrillIndices}
                    onReorder={handleReorderDrills}
                    onRemove={handleRemoveDrillInstance}
                    onDuplicate={handleDuplicateDrillInstance}
                    sessionStartTime={session.start}
                    getDrillNote={(_, idx) => fieldDrills[idx]?.note || ''}
                    editingNoteDrillId={editingNoteDrillId}
                    setEditingNoteDrillId={setEditingNoteDrillId}
                    noteInput={noteInput}
                    setNoteInput={setNoteInput}
                    handleSaveDrillNote={(idx, note) => handleSaveDrillInstanceNote(idx, note)}
                    editingDurationKey={editingDurationKey}
                    setEditingDurationKey={setEditingDurationKey}
                    durationInput={durationInput}
                    setDurationInput={setDurationInput}
                    handleSaveDrillDuration={handleSaveDrillDuration}
                    setImageModalUrl={setImageModalUrl}
                    setImageModalOpen={setImageModalOpen}
                  />
                  <div><strong>Total Field Drill Time:</strong> {totalDrillTime} min</div>
                </div>
              )}
              {(sessionViewFilter === 'both' || sessionViewFilter === 'gk') && (
                <div style={{ flex: 1 }}>
                  <h4>Goal Keeper Drills</h4>
                  <DraggableDrillPills
                    assignedDrills={gkDrills}
                    assignedDrillIndices={gkDrillIndices}
                    onReorder={handleReorderDrills}
                    onRemove={handleRemoveDrillInstance}
                    onDuplicate={handleDuplicateDrillInstance}
                    sessionStartTime={session.start}
                    getDrillNote={(_, idx) => gkDrills[idx]?.note || ''}
                    editingNoteDrillId={editingNoteDrillId}
                    setEditingNoteDrillId={setEditingNoteDrillId}
                    noteInput={noteInput}
                    setNoteInput={setNoteInput}
                    handleSaveDrillNote={(idx, note) => handleSaveDrillInstanceNote(idx, note)}
                    editingDurationKey={editingDurationKey}
                    setEditingDurationKey={setEditingDurationKey}
                    durationInput={durationInput}
                    setDurationInput={setDurationInput}
                    handleSaveDrillDuration={handleSaveDrillDuration}
                    setImageModalUrl={setImageModalUrl}
                    setImageModalOpen={setImageModalOpen}
                  />
                  <div><strong>Total GK Drill Time:</strong> {totalGKDrillTime} min</div>
                </div>
              )}
            </div>
            {/* Add summary at the bottom */}
            <div style={{ background: '#f7f7f7', borderRadius: 8, padding: 12, marginTop: 16, fontSize: '1rem' }}>
              <div><strong>Total Minutes:</strong> {session.totalMinutes}</div>
              <div><strong>Total Drill Time:</strong> {totalDrillTime} min</div>
              <div><strong>Time Left in Session:</strong> {timeLeft} min</div>
            </div>
            <button
              onClick={() => setShowSessionDetails(false)}
              style={{ marginTop: 16, padding: '8px 24px', borderRadius: 8, border: '1.5px solid #1976d2', background: '#1976d2', color: '#fff', fontWeight: 'bold', fontSize: '1.1em', cursor: 'pointer', boxShadow: '0 2px 6px rgba(25, 118, 210, 0.08)', transition: 'background 0.2s, color 0.2s' }}
              onMouseOver={e => { e.target.style.background = '#1251a3'; }}
              onMouseOut={e => { e.target.style.background = '#1976d2'; }}
            >
              Save/Close
            </button>
            <button onClick={handleSaveAsTemplate} style={{ float: 'right', marginBottom: 8 }}>Save as Template</button>
            <button onClick={handleDeleteSession} style={{ float: 'right', marginBottom: 8, marginRight: 8, background: '#c00', color: '#fff' }}>Delete Session</button>
            {/* Spacer to prevent overlap with fixed bottom bar */}
            <div style={{ height: 120 }} />
          </div>
        </div>
      ) : (
        <>
          {/* Modernized Header */}
          <header style={{
            width: '100%',
            background: 'rgba(25, 118, 210, 0.04)',
            padding: '0 0 0 0',
            boxShadow: '0 2px 8px rgba(25, 118, 210, 0.04)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            minHeight: 72,
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 9999,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingLeft: 32 }}>
              <span style={{
                fontWeight: 'bold',
                fontSize: '1.35em',
                marginRight: 20,
                color: '#1976d2',
                background: 'rgba(25, 118, 210, 0.08)',
                borderRadius: 8,
                padding: '6px 18px',
                letterSpacing: '0.5px',
                boxShadow: '0 1px 4px rgba(25, 118, 210, 0.08)'
              }}>
                Team: {selectedTeam ? selectedTeam.name : ''}
              </span>
              <button onClick={() => setMembersModalOpen(true)} style={{ marginRight: 8, padding: '6px 18px', borderRadius: 6, border: '1.5px solid #1976d2', background: '#fff', color: '#1976d2', fontWeight: 'bold', cursor: 'pointer', fontSize: '1em' }}>Team Members</button>
              <button onClick={() => setTeamModalOpen(true)} style={{ marginRight: 8, padding: '6px 18px', borderRadius: 6, border: '1.5px solid #1976d2', background: '#fff', color: '#1976d2', fontWeight: 'bold', cursor: 'pointer', fontSize: '1em' }}>Create Team</button>
              <button onClick={() => setJoinModalOpen(true)} style={{ marginRight: 8, padding: '6px 18px', borderRadius: 6, border: '1.5px solid #1976d2', background: '#fff', color: '#1976d2', fontWeight: 'bold', cursor: 'pointer', fontSize: '1em' }}>Join Team</button>
              {teams.length > 1 && (
                <select value={selectedTeam ? selectedTeam.id : ''} onChange={e => setSelectedTeam(teams.find(t => t.id === e.target.value))} style={{ padding: '6px 12px', borderRadius: 6, border: '1.5px solid #1976d2', fontWeight: 'bold', fontSize: '1em' }}>
                  {teams.map(team => (
                    <option key={team.id} value={team.id}>{team.name}</option>
                  ))}
                </select>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingRight: 32 }}>
              <span style={{
                marginRight: 20,
                fontWeight: 'bold',
                fontSize: '1.15em',
                color: '#1976d2',
                background: 'rgba(25, 118, 210, 0.08)',
                borderRadius: 8,
                padding: '6px 18px',
                letterSpacing: '0.5px',
                boxShadow: '0 1px 4px rgba(25, 118, 210, 0.08)'
              }}>
                Signed in as {user.displayName || user.email}
              </span>
              <button onClick={handleSignOut} style={{ padding: '6px 18px', borderRadius: 6, border: '1.5px solid #1976d2', background: '#fff', color: '#1976d2', fontWeight: 'bold', cursor: 'pointer', fontSize: '1em', boxShadow: '0 2px 6px rgba(25, 118, 210, 0.08)', transition: 'background 0.2s, color 0.2s' }}>
                Sign Out
              </button>
            </div>
          </header>
          {/* Main Content Area */}
          <main style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 0,
            position: 'relative',
            width: '100%',
            height: 'calc(100vh - 72px - 96px)', // header + bottom bar
            marginTop: 72,
          }}>
            {!showSessionDetails && (
              <div className="calendar-container" style={{
                background: '#fff',
                borderRadius: 16,
                boxShadow: '0 4px 24px rgba(25, 118, 210, 0.10)',
                padding: 32,
                maxWidth: 600,
                minWidth: 340,
                minHeight: 420,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Calendar
                key={Object.keys(sessions).join(',')}
                onChange={setDate}
                value={date}
                onClickDay={handleDateClick}
                tileContent={calendarTileContent}
                    onActiveStartDateChange={({ activeStartDate }) => setCalendarMonth(activeStartDate)}
              />
            </div>
            )}
          </main>
          {/* Fixed Bottom Bar for Actions */}
          <div style={{
            position: 'fixed',
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(25, 118, 210, 0.04)',
            padding: '24px 0 24px 0',
            display: 'flex',
            justifyContent: 'center',
            gap: 32,
            zIndex: 20,
            boxShadow: '0 -2px 8px rgba(25, 118, 210, 0.04)'
          }}>
          <button
            onClick={() => setDrillSectionOpen(true)}
            style={{
              padding: '12px 32px',
              borderRadius: 8,
              border: 'none',
              background: '#1976d2',
              color: '#fff',
              fontWeight: 'bold',
              fontSize: '1.2rem',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(25, 118, 210, 0.10)',
                transition: 'background 0.2s, color 0.2s',
            }}
          >
            Drills/Exercises
          </button>
            <button
              onClick={() => setTemplateSectionOpen(true)}
              style={{
                padding: '12px 32px',
                borderRadius: 8,
                border: 'none',
                background: '#1976d2',
                color: '#fff',
                fontWeight: 'bold',
                fontSize: '1.2rem',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(25, 118, 210, 0.10)',
                transition: 'background 0.2s, color 0.2s',
              }}
            >
              Previous Practice Sessions
            </button>
          </div>
        </>
      )}
      {/* Drills/Exercises Modal Trigger */}
      {drillSectionOpen && (
        <div className="modal-backdrop" style={{ zIndex: 11000 }}>
          <div
            className="modal"
            style={{
              zIndex: 11001,
              maxWidth: 800,
              minWidth: 420,
              minHeight: 500,
              maxHeight: '85vh',
              marginTop: 90, // push below header
              boxShadow: '0 8px 32px rgba(25, 118, 210, 0.18)',
              overflowY: 'auto',
              padding: 32,
              background: '#fff',
              borderRadius: 18,
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0 }}>Drills/Exercises</h2>
              <button onClick={() => setDrillSectionOpen(false)} style={{ fontSize: '1.5rem', background: 'none', border: 'none', color: '#1976d2', cursor: 'pointer', fontWeight: 'bold' }}>×</button>
            </div>
            <button onClick={() => setDrillModalOpen(true)} style={{ marginBottom: 12 }}>Add Drill</button>
            {/* Drill List Filters */}
            <div style={{ margin: '8px 0 8px 0', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <span>Filter by Name:</span>
              <input
                type="text"
                value={drillListNameFilter}
                onChange={e => setDrillListNameFilter(e.target.value)}
                placeholder="Drill name..."
                style={{ minWidth: 120, marginRight: 8 }}
              />
              <span>Filter by Category:</span>
              <select value={drillListCategoryFilter} onChange={e => setDrillListCategoryFilter(e.target.value)} style={{ minWidth: 120 }}>
                <option value="">All</option>
                {teamCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <span>Min Rank:</span>
              <select value={drillListRankFilter} onChange={e => setDrillListRankFilter(Number(e.target.value))} style={{ minWidth: 60 }}>
                {[1,2,3,4,5].map(n => (
                  <option key={n} value={n}>{n}+</option>
                ))}
              </select>
              <button
                type="button"
                onClick={clearDrillListFilters}
                style={{
                  marginLeft: 8,
                  padding: '4px 16px',
                  borderRadius: 6,
                  border: '1.5px solid #1976d2',
                  background: '#1976d2',
                  color: '#fff',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(25, 118, 210, 0.08)',
                  transition: 'background 0.2s, color 0.2s',
                }}
                onMouseOver={e => { e.target.style.background = '#1251a3'; }}
                onMouseOut={e => { e.target.style.background = '#1976d2'; }}
              >
                Clear Filters
              </button>
            </div>
            {drillLoading ? (
              <p>Loading drills...</p>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {filteredDrillList.map((drill) => (
                  <li key={drill.id} style={{
                    background: '#f5f7fa',
                    borderRadius: 10,
                    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                    padding: '1rem 1.25rem',
                    marginBottom: 16,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                        <strong style={{ fontSize: '1.1em' }}>{drill.name}</strong>
                        <span style={{ color: '#1976d2', fontWeight: 500, marginLeft: 4, fontSize: '1em' }}>({drill.duration} min)</span>
                        {renderStars(drill.rank || 3)}
                        <LinkIcon url={drill.link} />
                        {drill.categories && drill.categories.length > 0 && (
                          <span style={{ marginLeft: 8 }}>
                            {drill.categories.map(cat => (
                              <span key={cat} style={{ background: '#e0e0e0', color: '#333', borderRadius: 8, padding: '2px 8px', marginRight: 4, fontSize: '0.85em', fontWeight: 500 }}>{cat}</span>
                            ))}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button
                          onClick={() => {
                            setDrillForm({
                              id: drill.id, // <-- ensure this is included!
                              name: drill.name || '',
                              description: drill.description || '',
                              duration: drill.duration ? drill.duration.toString() : '',
                              link: drill.link || '',
                              categories: drill.categories || [],
                              rank: drill.rank || 3,
                              images: drill.images || [],
                            });
                            setDrillModalOpen(true);
                          }}
                          style={{ marginLeft: 8 }}
                        >
                          Edit
                        </button>
                        <button onClick={() => handleDeleteDrill(drill.id)} style={{ marginLeft: 8 }}>Delete</button>
                      </div>
                    </div>
                    {drill.description && (
                      <div style={{ color: '#444', fontSize: '0.98em', marginTop: 2 }}>{drill.description}</div>
                    )}
                    <DrillImageGallery images={drill.images} onClick={url => { setImageModalUrl(url); setImageModalOpen(true); }} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
      {modalOpen && (
        <div className="modal-backdrop" style={{ zIndex: 10000 }}>
          <div className="modal" style={{ zIndex: 10001 }}>
            <button
              onClick={() => setModalOpen(false)}
              style={{ position: 'absolute', top: 24, right: 24, fontSize: '1.5rem', background: 'none', border: 'none', color: '#1976d2', cursor: 'pointer', fontWeight: 'bold' }}
              aria-label="Close session modal"
            >
              ×
            </button>
            <h2>Practice Session for {date.toDateString()}</h2>
            <form onSubmit={handleSubmit}>
              <label>
                Location:<br />
                <input
                  type="text"
                  name="location"
                  value={form.location}
                  onChange={handleChange}
                  required
                />
              </label>
              <br />
              <label>
                Start Time:<br />
                <input
                  type="time"
                  name="start"
                  value={form.start}
                  onChange={handleChange}
                  required
                />
              </label>
              <br />
              <label>
                End Time:<br />
                <input
                  type="time"
                  name="end"
                  value={form.end}
                  onChange={handleChange}
                  required
                />
              </label>
              <br />
              <label>
                Objective:<br />
                <input
                  type="text"
                  name="objective"
                  value={form.objective}
                  onChange={handleChange}
                  placeholder="e.g. Build from the back, focus on transitions"
                  style={{ width: '100%' }}
                />
              </label>
              <br />
              {/* Drill selection with filters and improved layout */}
              <label>
                Assign Drills:
                <div style={{ margin: '8px 0 8px 0', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span>Filter by Name:</span>
                  <input
                    type="text"
                    value={drillNameFilter}
                    onChange={e => setDrillNameFilter(e.target.value)}
                    placeholder="Drill name..."
                    style={{ minWidth: 120, marginRight: 8 }}
                  />
                  <span>Filter by Category:</span>
                  <select value={drillCategoryFilter} onChange={e => setDrillCategoryFilter(e.target.value)} style={{ minWidth: 120 }}>
                    <option value="">All</option>
                    {teamCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  <span>Min Rank:</span>
                  <select value={drillRankFilter} onChange={e => setDrillRankFilter(Number(e.target.value))} style={{ minWidth: 60 }}>
                    {[1,2,3,4,5].map(n => (
                      <option key={n} value={n}>{n}+</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={clearDrillFilters}
                    style={{
                      marginLeft: 8,
                      padding: '4px 16px',
                      borderRadius: 6,
                      border: '1.5px solid #1976d2',
                      background: '#1976d2',
                      color: '#fff',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      boxShadow: '0 2px 6px rgba(25, 118, 210, 0.08)',
                      transition: 'background 0.2s, color 0.2s',
                    }}
                    onMouseOver={e => { e.target.style.background = '#1251a3'; }}
                    onMouseOut={e => { e.target.style.background = '#1976d2'; }}
                  >
                    Clear Filters
                  </button>
                </div>
                <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid #eee', borderRadius: 6, padding: 8, marginBottom: 12, background: '#fafbfc' }}>
                  {filteredDrills.length === 0 ? (
                    <span style={{ color: '#888' }}>No drills match the selected filters.</span>
                  ) : (
                    filteredDrills.map((drill, idx) => (
                      <div key={drill.id} style={{ display: 'flex', alignItems: 'center', background: '#fff', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: 8, padding: '8px 12px' }}>
                        {/* GK Drill Checkbox */}
                        <input
                          type="checkbox"
                          id={`gk-drill-checkbox-${drill.id}`}
                          checked={!!gkDrillCheckboxes[drill.id]}
                          onChange={e => setGKDrillCheckboxes(prev => ({ ...prev, [drill.id]: e.target.checked }))}
                          style={{ marginRight: 8 }}
                        />
                        <label htmlFor={`gk-drill-checkbox-${drill.id}`} style={{ marginRight: 12, fontSize: '0.98em', color: '#1976d2', fontWeight: 500 }}>
                          GK Drill
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            handleAddDrillInstance(drill.id, idx, !!gkDrillCheckboxes[drill.id]);
                            setGKDrillCheckboxes(prev => ({ ...prev, [drill.id]: false }));
                          }}
                          className={addBtnAnimIdx === idx ? 'add-btn-animate' : ''}
                          style={{
                            marginRight: 12,
                            padding: '4px 16px',
                            borderRadius: 6,
                            border: '1.5px solid #1976d2',
                            background: '#1976d2',
                            color: '#fff',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            boxShadow: '0 2px 6px rgba(25, 118, 210, 0.08)',
                            transition: 'background 0.2s, color 0.2s',
                          }}
                          onMouseOver={e => { e.target.style.background = '#1251a3'; }}
                          onMouseOut={e => { e.target.style.background = '#1976d2'; }}
                        >
                          Add
                        </button>
                        <div style={{ flex: 1 }}>
                          <strong>{drill.name}</strong> ({drill.duration} min)
                          {renderStars(drill.rank || 3)}
                          {drill.categories && drill.categories.length > 0 && (
                            <span style={{ marginLeft: 8 }}>
                              {drill.categories.map(cat => (
                                <span key={cat} style={{ background: '#e0e0e0', color: '#333', borderRadius: 8, padding: '2px 8px', marginRight: 4, fontSize: '0.85em' }}>{cat}</span>
                              ))}
                            </span>
                          )}
                          <br />
                          <span style={{ fontWeight: 'normal', fontSize: '0.95em', color: '#444' }}>{drill.description}</span>
                        </div>
                        <LinkIcon url={drill.link} />
                      </div>
                    ))
                  )}
                </div>
              </label>
              {/* Session time summary */}
              <div style={{ background: '#f7f7f7', borderRadius: 8, padding: 12, marginBottom: 12, fontSize: '1rem' }}>
                <div><strong>Total Session Time:</strong> {session ? session.totalMinutes : 0} min</div>
                <div><strong>Planned Drill Time:</strong> {totalDrillTime} min</div>
                <div><strong>Time Remaining:</strong> {timeLeft} min</div>
              </div>
              <button type="submit">Save Session</button>
              <button type="button" onClick={() => setModalOpen(false)} style={{ marginLeft: 8 }}>
                Cancel
              </button>
            </form>
          </div>
        </div>
      )}
      {/* Previous Practice Sessions Modal Trigger */}
      {templateSectionOpen && (
        <div className="modal-backdrop" style={{ zIndex: 10000 }}>
          <div className="modal" style={{ zIndex: 10001 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0 }}>Previous Practice Sessions</h2>
              <button onClick={() => setTemplateSectionOpen(false)} style={{ fontSize: '1.5rem', background: 'none', border: 'none', color: '#1976d2', cursor: 'pointer', fontWeight: 'bold' }}>×</button>
            </div>
            {loadingTemplates ? (
              <p>Loading templates...</p>
            ) : templates.length === 0 ? (
              <p>No saved practice sessions yet.</p>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {templates.map(t => (
                  <li key={t.id} style={{ marginBottom: 12, background: '#f7f7f7', borderRadius: 8, padding: '0.75rem 1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <strong>{t.name}</strong> <span style={{ color: '#888', fontSize: '0.95em' }}>Created on {new Date(t.createdAt).toLocaleDateString()}</span>
                    <button onClick={() => handleApplyTemplate(t)} style={{ marginLeft: 12 }}>Apply to Selected Date</button>
                    <button
                      onClick={() => handleDeleteTemplate(t.id)}
                      style={{
                        marginLeft: 8,
                        background: '#c00',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 6,
                        padding: '4px 12px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                      }}
                    >
                      Delete
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
      {templateModalOpen && (
        <div className="modal-backdrop" style={{ zIndex: 10000 }}>
          <div className="modal" style={{ zIndex: 10001 }}>
            <h2>Save Practice Session as Template</h2>
            <label>
              Template Name:<br />
              <input
                type="text"
                value={templateName}
                onChange={e => setTemplateName(e.target.value)}
                style={{ width: '100%', marginBottom: 12 }}
                placeholder="e.g. U10 Attacking Practice"
              />
            </label>
            <br />
            <button onClick={handleConfirmSaveTemplate} disabled={!templateName}>Save</button>
            <button onClick={() => setTemplateModalOpen(false)} style={{ marginLeft: 8 }}>Cancel</button>
          </div>
        </div>
      )}
      {drillModalOpen && (
        <div className="modal-backdrop" style={{ zIndex: 12000 }}>
          <div className="modal" style={{
            zIndex: 12001,
            maxWidth: 500,
            minWidth: 340,
            marginTop: 90, // push below header
            boxShadow: '0 8px 32px rgba(25, 118, 210, 0.18)',
            background: '#fff',
            borderRadius: 18,
            position: 'relative',
            padding: 32,
            display: 'flex',
            flexDirection: 'column',
          }}>
            <button
              onClick={() => { setDrillModalOpen(false); setDrillForm({ name: '', description: '', duration: '', link: '', categories: [], rank: 3, images: [] }); }}
              style={{ position: 'absolute', top: 24, right: 24, fontSize: '1.5rem', background: 'none', border: 'none', color: '#1976d2', cursor: 'pointer', fontWeight: 'bold' }}
              aria-label="Close drill modal"
            >
              ×
            </button>
            <h2>{drillForm.name ? 'Edit Drill/Exercise' : 'Add Drill/Exercise'}</h2>
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!drillForm.name || !drillForm.duration) return;
              const newDrill = {
                name: drillForm.name,
                description: drillForm.description,
                duration: parseInt(drillForm.duration, 10),
                link: drillForm.link,
                categories: drillForm.categories,
                rank: drillForm.rank,
                teamId: selectedTeam.id,
                images: drillForm.images,
              };
              if (drillForm.name && drillForm.id) {
                await setDoc(doc(db, 'drills', drillForm.id), newDrill);
                setDrills(drills.map(d => d.id === drillForm.id ? { ...d, ...newDrill, id: drillForm.id } : d));
              } else {
                const docRef = await addDoc(collection(db, 'drills'), newDrill);
                setDrills([...drills, { id: docRef.id, ...newDrill }]);
              }
              setDrillForm({ name: '', description: '', duration: '', link: '', categories: [], rank: 3, images: [] });
              setDrillModalOpen(false);
            }}>
              <label>
                Name:<br />
                <input
                  type="text"
                  name="name"
                  value={drillForm.name}
                  onChange={e => setDrillForm({ ...drillForm, name: e.target.value })}
                  required
                />
              </label>
              <br />
              <label>
                Description:<br />
                <textarea
                  name="description"
                  value={drillForm.description}
                  onChange={e => setDrillForm({ ...drillForm, description: e.target.value })}
                />
              </label>
              <br />
              <label>
                Duration (minutes):<br />
                <input
                  type="number"
                  name="duration"
                  value={drillForm.duration}
                  onChange={e => setDrillForm({ ...drillForm, duration: e.target.value })}
                  required
                  min="1"
                />
              </label>
              <br />
              <label>
                Link (YouTube, Facebook, etc):<br />
                <input
                  type="url"
                  name="link"
                  value={drillForm.link}
                  onChange={e => setDrillForm({ ...drillForm, link: e.target.value })}
                  placeholder="https://..."
                />
              </label>
              <br />
              <label>
                Categories:<br />
                <select
                  name="categories"
                  multiple
                  value={drillForm.categories}
                  onChange={e => {
                    const selected = Array.from(e.target.options).filter(o => o.selected).map(o => o.value);
                    setDrillForm({ ...drillForm, categories: selected });
                  }}
                  style={{ width: '100%', minHeight: 180, marginBottom: 8 }}
                >
                  {teamCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <button
                    type="button"
                    onClick={() => { setAddCategoryModalOpen(true); setNewCategoryInput(''); setAddCategoryError(''); }}
                    style={{ borderRadius: 6, border: '1.5px solid #1976d2', background: '#fff', color: '#1976d2', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.95em', padding: '4px 16px' }}
                    disabled={!selectedTeam}
                  >
                    Add Category
                  </button>
                  <button
                    type="button"
                    onClick={openManageCategoriesModal}
                    style={{ borderRadius: 6, border: '1.5px solid #1976d2', background: '#fff', color: '#1976d2', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.95em', padding: '4px 16px' }}
                    disabled={!selectedTeam}
                  >
                    Manage Categories
                  </button>
                </div>
              </label>
              <br />
              <label>
                Rank:<br />
                <select
                  name="rank"
                  value={drillForm.rank}
                  onChange={e => setDrillForm({ ...drillForm, rank: parseInt(e.target.value, 10) })}
                  style={{ width: '100px', marginBottom: 8 }}
                >
                  {[1, 2, 3, 4, 5].map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
                {renderStars(drillForm.rank)}
              </label>
              <br />
              <div
                onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
                onDrop={async e => {
                  e.preventDefault();
                  e.stopPropagation();
                  const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
                  if (files.length === 0) return;
                  setUploadingImages(true);
                  setUploadError('');
                  try {
                    const urls = [];
                    for (const file of files) {
                      const fileRef = storageRef(storage, `drill-images/${selectedTeam.id}/${Date.now()}-${file.name}`);
                      await uploadBytes(fileRef, file);
                      const url = await getDownloadURL(fileRef);
                      urls.push(url);
                    }
                    setDrillForm(f => ({ ...f, images: [...(f.images || []), ...urls] }));
                  } catch (err) {
                    setUploadError('Failed to upload image(s).');
                  }
                  setUploadingImages(false);
                }}
                style={{ border: '2px dashed #1976d2', borderRadius: 10, padding: 16, marginBottom: 12, textAlign: 'center', background: '#f7faff', cursor: 'pointer' }}
              >
                <div>Drag & drop images here, or <label style={{ color: '#1976d2', textDecoration: 'underline', cursor: 'pointer' }}>
                  click to select
                  <input type="file" accept="image/*" multiple style={{ display: 'none' }}
                    onChange={async e => {
                      const files = Array.from(e.target.files).filter(f => f.type.startsWith('image/'));
                      if (files.length === 0) return;
                      setUploadingImages(true);
                      setUploadError('');
                      try {
                        const urls = [];
                        for (const file of files) {
                          const fileRef = storageRef(storage, `drill-images/${selectedTeam.id}/${Date.now()}-${file.name}`);
                          await uploadBytes(fileRef, file);
                          const url = await getDownloadURL(fileRef);
                          urls.push(url);
                        }
                        setDrillForm(f => ({ ...f, images: [...(f.images || []), ...urls] }));
                      } catch (err) {
                        setUploadError('Failed to upload image(s).');
                      }
                      setUploadingImages(false);
                    }}
                  />
                </label></div>
                {uploadingImages && <div style={{ color: '#1976d2', marginTop: 8 }}>Uploading...</div>}
                {uploadError && <div style={{ color: '#c00', marginTop: 8 }}>{uploadError}</div>}
                {drillForm.images && drillForm.images.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12, justifyContent: 'center' }}>
                    {drillForm.images.map((img, idx) => (
                      <div key={img} style={{ position: 'relative' }}>
                        <img src={img} alt="Drill" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, border: '1px solid #eee' }} />
                        <button type="button" onClick={() => setDrillForm(f => ({ ...f, images: f.images.filter((_, i) => i !== idx) }))} style={{ position: 'absolute', top: 2, right: 2, background: '#c00', color: '#fff', border: 'none', borderRadius: '50%', width: 20, height: 20, fontWeight: 'bold', cursor: 'pointer', fontSize: 14 }}>×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <br />
              <button type="submit">{drillForm.name ? 'Save Changes' : 'Add Drill'}</button>
              <button type="button" onClick={() => { setDrillModalOpen(false); setDrillForm({ name: '', description: '', duration: '', link: '', categories: [], rank: 3, images: [] }); }} style={{ marginLeft: 8 }}>
                Cancel
              </button>
            </form>
          </div>
        </div>
      )}
      {addCategoryModalOpen && (
        <div className="modal-backdrop" style={{ zIndex: 13000 }}>
          <div className="modal" style={{ zIndex: 13001, maxWidth: 400, minWidth: 300, marginTop: 120, boxShadow: '0 8px 32px rgba(25, 118, 210, 0.18)', background: '#fff', borderRadius: 18, position: 'relative', padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <button onClick={() => setAddCategoryModalOpen(false)} style={{ position: 'absolute', top: 24, right: 24, fontSize: '1.5rem', background: 'none', border: 'none', color: '#1976d2', cursor: 'pointer', fontWeight: 'bold' }} aria-label="Close add category modal">×</button>
            <h2>Add New Category</h2>
            <input type="text" value={newCategoryInput} onChange={e => { setNewCategoryInput(e.target.value); setAddCategoryError(''); }} placeholder="Category name" style={{ width: '100%', marginBottom: 12, borderRadius: 6, border: '1px solid #ccc', padding: '8px 12px', fontSize: '1.1em' }} />
            {addCategoryError && <div style={{ color: '#c00', marginBottom: 8 }}>{addCategoryError}</div>}
            <button onClick={handleAddCategory} style={{ padding: '8px 24px', borderRadius: 8, border: 'none', background: '#1976d2', color: '#fff', fontWeight: 'bold', fontSize: '1.1em', cursor: 'pointer', boxShadow: '0 2px 8px rgba(25, 118, 210, 0.10)' }}>Add</button>
          </div>
        </div>
      )}
      {manageCategoriesModalOpen && (
        <div className="modal-backdrop" style={{ zIndex: 14000 }}>
          <div className="modal" style={{ zIndex: 14001, maxWidth: 400, minWidth: 300, marginTop: 120, boxShadow: '0 8px 32px rgba(25, 118, 210, 0.18)', background: '#fff', borderRadius: 18, position: 'relative', padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <button onClick={() => setManageCategoriesModalOpen(false)} style={{ position: 'absolute', top: 24, right: 24, fontSize: '1.5rem', background: 'none', border: 'none', color: '#1976d2', cursor: 'pointer', fontWeight: 'bold' }} aria-label="Close manage categories modal">×</button>
            <h2>Manage Categories</h2>
            <div style={{ width: '100%', marginBottom: 16 }}>
              <DndContext
                collisionDetection={closestCenter}
                onDragEnd={event => {
                  const { active, over } = event;
                  if (active.id !== over.id) {
                    const oldIndex = categoryOrder.findIndex(c => c === active.id);
                    const newIndex = categoryOrder.findIndex(c => c === over.id);
                    const newOrder = [...categoryOrder];
                    const [moved] = newOrder.splice(oldIndex, 1);
                    newOrder.splice(newIndex, 0, moved);
                    setCategoryOrder(newOrder);
                  }
                }}
              >
                <SortableContext items={categoryOrder} strategy={verticalListSortingStrategy}>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {categoryOrder.map(cat => (
                      <CategoryRow
                        key={cat}
                        cat={cat}
                        onDelete={() => setCategoryToDelete(cat)}
                      />
                    ))}
                  </ul>
                </SortableContext>
              </DndContext>
            </div>
            {categoryDeleteError && <div style={{ color: '#c00', marginBottom: 8 }}>{categoryDeleteError}</div>}
            <button onClick={handleSaveCategoryOrder} style={{ padding: '8px 24px', borderRadius: 8, border: 'none', background: '#1976d2', color: '#fff', fontWeight: 'bold', fontSize: '1.1em', cursor: 'pointer', boxShadow: '0 2px 8px rgba(25, 118, 210, 0.10)' }}>Save Order</button>
            {categoryToDelete && (
              <div style={{ marginTop: 16, background: '#fffbe6', border: '1px solid #ffe58f', borderRadius: 8, padding: 16, textAlign: 'center' }}>
                <div style={{ marginBottom: 8 }}>Delete category <strong>{categoryToDelete}</strong>? This cannot be undone.</div>
                <button onClick={() => handleDeleteCategory(categoryToDelete)} style={{ background: '#c00', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 18px', fontWeight: 'bold', marginRight: 8 }}>Delete</button>
                <button onClick={() => setCategoryToDelete(null)} style={{ background: '#eee', color: '#222', border: 'none', borderRadius: 6, padding: '6px 18px', fontWeight: 'bold' }}>Cancel</button>
              </div>
            )}
          </div>
        </div>
      )}
      {imageModalOpen && (
        <div className="modal-backdrop" style={{ zIndex: 15000 }}>
          <div className="modal" style={{ zIndex: 15001, maxWidth: 700, minWidth: 320, marginTop: 90, boxShadow: '0 8px 32px rgba(25, 118, 210, 0.18)', background: '#fff', borderRadius: 18, position: 'relative', padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <button onClick={() => setImageModalOpen(false)} style={{ position: 'absolute', top: 18, right: 18, fontSize: '1.5rem', background: 'none', border: 'none', color: '#1976d2', cursor: 'pointer', fontWeight: 'bold' }} aria-label="Close image modal">×</button>
            <img src={imageModalUrl} alt="Drill Full" style={{ maxWidth: '90vw', maxHeight: '70vh', borderRadius: 12, boxShadow: '0 2px 12px rgba(25,118,210,0.10)' }} />
          </div>
        </div>
      )}
      {imageModalOpen && (
        <div className="modal-backdrop" style={{ zIndex: 25000 }}>
          <div className="modal" style={{ zIndex: 25001, maxWidth: 700, minWidth: 320, marginTop: 90, boxShadow: '0 8px 32px rgba(25, 118, 210, 0.18)', background: '#fff', borderRadius: 18, position: 'relative', padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <button onClick={() => setImageModalOpen(false)} style={{ position: 'absolute', top: 18, right: 18, fontSize: '1.5rem', background: 'none', border: 'none', color: '#1976d2', cursor: 'pointer', fontWeight: 'bold' }} aria-label="Close image modal">×</button>
            <img src={imageModalUrl} alt="Drill Full" style={{ maxWidth: '90vw', maxHeight: '70vh', borderRadius: 12, boxShadow: '0 2px 12px rgba(25,118,210,0.10)' }} />
          </div>
        </div>
      )}
    </div>
  );
}

// Increase the calendar month/year label by 30%
const calendarLabelStyle = document.createElement('style');
calendarLabelStyle.innerHTML = `
  .react-calendar__navigation__label__labelText {
    font-size: 2.25em !important;
  }
`;
if (!document.head.querySelector('#calendar-label-style')) {
  calendarLabelStyle.id = 'calendar-label-style';
  document.head.appendChild(calendarLabelStyle);
}

// Style the calendar navigation arrows to be more obvious
const calendarArrowStyle = document.createElement('style');
calendarArrowStyle.innerHTML = `
  .react-calendar__navigation__arrow {
    font-size: 1em !important;
    color: #1976d2 !important;
    font-weight: bold !important;
    background: #e3f0fb !important;
    border-radius: 50% !important;
    width: 1.1em !important;
    height: 1.1em !important;
    transition: background 0.2s, color 0.2s;
    margin: 0 0.2em;
  }
  .react-calendar__navigation__arrow:hover {
    background: #1976d2 !important;
    color: #fff !important;
    box-shadow: 0 2px 8px rgba(25, 118, 210, 0.15);
  }
`;
if (!document.head.querySelector('#calendar-arrow-style')) {
  calendarArrowStyle.id = 'calendar-arrow-style';
  document.head.appendChild(calendarArrowStyle);
}

// Helper component for sortable category row
function CategoryRow({ cat, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: cat });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 2 : 1,
    background: isDragging ? '#e3f0fb' : '#f7f7f7',
    borderRadius: 8,
    marginBottom: 8,
    padding: '8px 12px',
    display: 'flex',
    alignItems: 'center',
    boxShadow: isDragging ? '0 2px 8px rgba(25,118,210,0.10)' : 'none',
  };
  return (
    <li ref={setNodeRef} style={style}>
      <span {...attributes} {...listeners} style={{ cursor: 'grab', marginRight: 12, fontSize: '1.2em', userSelect: 'none', display: 'flex', alignItems: 'center' }}>≡</span>
      <span style={{ flex: 1 }}>{cat}</span>
      <button onClick={onDelete} style={{ background: '#c00', color: '#fff', border: 'none', borderRadius: '50%', width: 22, height: 22, cursor: 'pointer', fontWeight: 'bold', marginLeft: 8 }}>×</button>
    </li>
  );
}

// Helper for image gallery icon
function DrillImageGallery({ images, onClick }) {
  if (!images || images.length === 0) return null;
  const maxThumbs = 3;
  return (
    <span style={{ marginLeft: 8, display: 'inline-flex', alignItems: 'center', gap: 2 }}>
      {images.slice(0, maxThumbs).map((img, idx) => (
        <img
          key={img}
          src={img}
          alt="Drill"
          style={{ width: 28, height: 28, objectFit: 'cover', borderRadius: 6, border: '1.5px solid #1976d2', cursor: 'pointer', marginRight: 2 }}
          onClick={e => { e.stopPropagation(); onClick(img); }}
        />
      ))}
      {images.length > maxThumbs && (
        <span style={{ background: '#1976d2', color: '#fff', borderRadius: 6, padding: '0 6px', fontSize: '0.95em', fontWeight: 600, marginLeft: 2 }}>
          +{images.length - maxThumbs}
        </span>
      )}
    </span>
  );
}

export default App;
