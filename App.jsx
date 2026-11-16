export default function App() {
  const [activeTab, setActiveTab] = useState('workout');
  const partner1 = 'Martin';
  const partner2 = 'Karine';
  
  const [completedWorkouts, setCompletedWorkouts] = useState({});

  const toggleWorkout = (day, partner) => {
    const key = `${day}-${partner}`;
    setCompletedWorkouts(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', color: '#f8fafc', fontFamily: 'sans-serif', padding: '20px' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <header style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '10px', color: '#38bdf8' }}>Couples Workout Challenge</h1>
          <p style={{ fontSize: '1.2rem', color: '#94a3b8' }}>{partner1} & {partner2}'s Fitness Journey</p>
        </header>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginBottom: '30px' }}>
          <button 
            onClick={() => setActiveTab('workout')}
            style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', backgroundColor: activeTab === 'workout' ? '#38bdf8' : '#334155', color: '#fff', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Workouts
          </button>
          <button 
            onClick={() => setActiveTab('tracker')}
            style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', backgroundColor: activeTab === 'tracker' ? '#38bdf8' : '#334155', color: '#fff', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Tracker & Progress
          </button>
        </div>

        {activeTab === 'workout' && (
          <div style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}>
            <h2>Today's Routine</h2>
            <p style={{ color: '#cbd5e1' }}>Complete your daily bodyweight exercises together!</p>
            
            <div style={{ marginTop: '20px', display: 'grid', gap: '15px' }}>
              <div style={{ padding: '15px', backgroundColor: '#334155', borderRadius: '8px' }}>
                <h3>Push-ups & Squats Circuit</h3>
                <p>3 Sets of 10-15 Reps</p>
                <div style={{ marginTop: '10px', display: 'flex', gap: '20px' }}>
                  <label style={{ cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={!!completedWorkouts['day1-' + partner1]} 
                      onChange={() => toggleWorkout('day1', partner1)}
                      style={{ marginRight: '8px' }}
                    /> {partner1} Done
                  </label>
                  <label style={{ cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={!!completedWorkouts['day1-' + partner2]} 
                      onChange={() => toggleWorkout('day1', partner2)}
                      style={{ marginRight: '8px' }}
                    /> {partner2} Done
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tracker' && (
          <div style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}>
            <h2>Challenge Progress</h2>
            <p style={{ color: '#cbd5e1' }}>Keep each other motivated and track your consistency!</p>
            <div style={{ marginTop: '20px' }}>
              <p>{partner1}'s and {partner2}'s stats will appear here as you log your daily workouts.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
