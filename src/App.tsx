import { useState } from 'react';

// تكييف واجهة البيانات لتقبل مرونة التقارير بين المواد العلمية والرياضيات
interface GradingResult {
  score: string;
  summary: string;
  keywords_analysis: string | { correct?: string | string[]; missing?: string | string[] };
  verdict: string;
  tip: string;
}

type SubjectType = 
  | 'biology' | 'chemistry' | 'physics' | 'math' 
  | 'as_biology' | 'as_math_p1' | 'as_math_p2' | 'as_math_m1' | 'as_math_s1';

type BoardType = 'cambridge' | 'edexcel';

export default function App() {
  const [apiKey, setApiKey] = useState('');
  const [subject, setSubject] = useState<SubjectType>('biology');
  const [board, setBoard] = useState<BoardType>('cambridge');
  const [question, setQuestion] = useState('');
  const [markScheme, setMarkScheme] = useState('');
  const [studentAnswer, setStudentAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<GradingResult | null>(null);

  // تعريف قوائم المواد لكل جهة اختبار ديناميكياً
  const cambridgeSubjects = [
    { id: 'biology', label: '🧬 Biology' },
    { id: 'chemistry', label: '🧪 Chemistry' },
    { id: 'physics', label: '⚡ Physics' },
    { id: 'math', label: '📐 Mathematics' },
  ];

  const edexcelSubjects = [
    { id: 'biology', label: '🧬 Biology (IGCSE)' },
    { id: 'chemistry', label: '🧪 Chemistry (IGCSE)' },
    { id: 'physics', label: '⚡ Physics (IGCSE)' },
    { id: 'math', label: '📐 Mathematics (IGCSE)' },
    { id: 'as_biology', label: '🧬 AS Biology' },
    { id: 'as_math_p1', label: '📐 AS Maths P1 (Pure 1)' },
    { id: 'as_math_p2', label: '📐 AS Maths P2 (Pure 2)' },
    { id: 'as_math_m1', label: '📐 AS Maths M1 (Mechanics 1)' },
    { id: 'as_math_s1', label: '📐 AS Maths S1 (Statistics 1)' },
  ];

  // دالة لتغيير البورد وتصفية المادة المختارة تلقائياً لتجنب الأخطاء
  const handleBoardChange = (selectedBoard: BoardType) => {
    setBoard(selectedBoard);
    setResult(null);
    if (selectedBoard === 'cambridge') {
      // إذا تم اختيار كامبريدج، يتم إرجاع المادة لـ Biology العادية لأن مواد الـ AS ليست متاحة لها
      const validCie = ['biology', 'chemistry', 'physics', 'math'];
      if (!validCie.includes(subject)) {
        setSubject('biology');
      }
    }
  };

  const getThemeColors = (sub: SubjectType) => {
    if (sub.includes('math')) {
      return { primary: '#6a1b9a', lightBg: '#f3e5f5', border: '#ce93d8' };
    }
    if (sub.includes('biology')) {
      return { primary: '#2e7d32', lightBg: '#e8f5e9', border: '#a5d6a7' };
    }
    if (sub === 'chemistry') {
      return { primary: '#d84315', lightBg: '#fbe9e7', border: '#ffab91' };
    }
    if (sub === 'physics') {
      return { primary: '#1565c0', lightBg: '#e3f2fd', border: '#90caf9' };
    }
    return { primary: '#37474f', lightBg: '#eceff1', border: '#b0bec5' };
  };

  const currentTheme = getThemeColors(subject);

  // دالة توليد الـ System Instruction الصارمة ديناميكياً
  const generateSystemInstruction = (sub: SubjectType, examBoard: BoardType): string => {
    let boardSpecificRules = '';

    // === قواعد CAMBRIDGE الرسمية ===
    if (examBoard === 'cambridge') {
      boardSpecificRules = `
      OFFICIAL CAMBRIDGE (CIE) MARKING PRINCIPLES:
      1. POSITIVE MARKING: Award marks for correct/valid answers. DO NOT deduct marks for errors or omissions.
      2. CONTRADICTIONS: Do not choose between contradictory statements. If a correct statement is contradicted within the SAME student response, DO NOT award the mark for that point.
      3. SPELLING: Accept incorrect spellings UNLESS it causes confusion with another syllabus term.
      4. ECF (Error Carried Forward): Apply ECF if an incorrect answer is subsequently used correctly in calculations.
      5. ABBREVIATIONS IN MARK SCHEME: ';' separates marking points. '/' indicates alternatives. 'R' = REJECT. 'A' = Accept. 'I' = Ignore. 'ora' = or reverse argument. 'underline' = exact word MUST be used.
      `;
    } 
    // === قواعد EDEXCEL الرسمية ===
    else if (examBoard === 'edexcel') {
      boardSpecificRules = `
      OFFICIAL EDEXCEL GENERAL MARKING GUIDANCE:
      1. POSITIVE MARKING: Apply mark schemes positively. Reward candidates for what they have shown they can do rather than penalising for omissions.
      2. OBJECTIVE GRADING: All candidates receive the same treatment. Award full marks if deserved (matches the mark scheme). Award zero marks if the candidate's response is not worthy of credit. Do not limit achievement.
      3. STRICT ADHERENCE: Mark strictly according to the mark scheme, not according to personal perception of grade boundaries.
      4. CROSSED OUT WORK: Crossed-out work should be marked UNLESS the candidate has replaced it with an alternative response.
      `;
    }

    let subjectSpecificRules = '';
    
    // قواعد مواد الـ AS Maths الجديدة من إيديكسل
    if (sub.startsWith('as_math_')) {
      let moduleFocus = '';
      if (sub === 'as_math_p1') moduleFocus = 'Pure Mathematics 1 (Algebra, Coordinate Geometry, Sequences, Trigonometry, Integration/Differentiation basics).';
      if (sub === 'as_math_p2') moduleFocus = 'Pure Mathematics 2 (Proof, Algebra/Functions, Coordinate Geometry in (x,y) plane, Sequences/Series, Exponentials/Logarithms, Trigonometry, Differentiation/Integration).';
      if (sub === 'as_math_m1') moduleFocus = 'Mechanics 1 (Mathematical Modelling, Kinematics of a particle, Dynamics of a particle moving in a straight line, Statics of a particle, Moments). Ensure physical principles like F = ma, SUVAT, and resolving forces are applied correctly.';
      if (sub === 'as_math_s1') moduleFocus = 'Statistics 1 (Mathematical Modelling, Representation and summary of data, Probability, Correlation and regression, Discrete random variables, Normal distribution).';

      subjectSpecificRules = `
        - Focus Module: EDEXCEL AS-LEVEL MATHS - ${moduleFocus}
        - Strictly apply Edexcel Math Marking Guideline definitions:
          * 'M' marks (Method marks) are awarded for a correct method applied to appropriate numbers.
          * 'A' marks (Accuracy marks) are accuracy marks, and cannot be awarded unless the relevant 'M' mark has been earned.
          * 'B' marks are unconditional accuracy marks (independent of 'M' marks).
          * In the 'keywords_analysis' response field, clearly break down: "Awarded Marks (M/A/B)" and "Missed Marks/Steps".
      `;
    } 
    // قواعد الـ AS Biology الجديدة من إيديكسل
    else if (sub === 'as_biology') {
      subjectSpecificRules = `
        - Focus Module: EDEXCEL AS-LEVEL BIOLOGY.
        - Pay meticulous attention to biological terminology and exact wording (e.g., active site, condensation reaction, ester bonds, tertiary structure).
        - Focus on command words:
          * 'Describe': Candidate must state the points of a topic / give characteristics.
          * 'Explain': Candidate must provide scientific reasoning/justification.
        - Pay close attention to experimental questions (CPACs/practical skills) including control variables, validity, and reliability.
      `;
    }
    // بقية المواد الأساسية
    else if (sub === 'biology') {
      subjectSpecificRules = `- Apply strict keyword rules (e.g., 'denatured' not 'killed' for enzymes).`;
    } else if (sub === 'chemistry') {
      subjectSpecificRules = `- Pay extreme attention to chemical formulas, balanced equations, and state symbols if requested.`;
    } else if (sub === 'physics') {
      subjectSpecificRules = `- Check strictly for correct physical units (J, W, N, Ω) in the final answer.`;
    } else if (sub === 'math') {
      subjectSpecificRules = `
        - Focus heavily on Step-by-step Working (M marks for method, A marks for accuracy).
        - Use the 'keywords_analysis' field to break down "Correct Steps" and "Incorrect/Missing Steps".
      `;
    }

    return `
      You are an official, highly precise senior chief examiner for ${examBoard.toUpperCase()} IGCSE/AS-Level ${sub.toUpperCase()}.
      Your ONLY job is to grade the student's answer strictly against the provided Mark Scheme.

      ${boardSpecificRules}

      ${subjectSpecificRules}

      STRICT GRADING ACCURACY RULES:
      1. Conduct a meticulous, word-by-word analysis of the student's response.
      2. Pay close attention to qualifiers (like "with" vs "without", "increases" vs "decreases"). Never mistake a negative statement for a positive one.
      3. Provide clear, structured feedback explaining exactly which marks were awarded and why, quoting the matched phrases.

      STRICT FOCUS RULE: Refuse any conversation outside exam grading.

      You MUST return your response strictly as a JSON object with these keys:
      {
        "score": "X/Total", 
        "summary": "Precise grading summary based on examiner guidelines", 
        "keywords_analysis": "Detail which critical keywords/steps/marks were present and which were missing", 
        "verdict": "Syllabus understanding check", 
        "tip": "One clear constructive tip to help them get full marks next time"
      }
    `;
  };

  const handleGrade = async () => {
    if (!apiKey || !question || !markScheme || !studentAnswer) {
      setError('Please fill in all fields before grading.');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const cleanKey = apiKey.trim();
      const systemInstruction = generateSystemInstruction(subject, board);
      const userPrompt = `
        Question: ${question}
        Mark Scheme: ${markScheme}
        Student's Answer: ${studentAnswer}
      `;

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${cleanKey}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: systemInstruction },
            { role: 'user', content: userPrompt }
          ],
          response_format: { type: 'json_object' },
          temperature: 0
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData?.error?.message || `Groq Server Error: ${response.status}`);
      }

      const data = await response.json();
      const textResponse = data.choices?.[0]?.message?.content;

      if (!textResponse) throw new Error('No response returned from Groq Engine.');

      const parsedResult: GradingResult = JSON.parse(textResponse);
      setResult(parsedResult);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred during grading.');
    } finally {
      setLoading(false);
    }
  };

  const renderKeywordsAnalysis = (data: any) => {
    if (!data) return null;
    if (typeof data === 'string') return <p style={{ margin: 0, whiteSpace: 'pre-line' }}>{data}</p>;
    if (typeof data === 'object') {
      const correct = data.correct || data.present || data.found || data.correct_steps;
      const missing = data.missing || data.absent || data.missing_steps;
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {correct && (
            <div>
              <strong style={{ color: '#137333' }}>✔️ Correct Keywords / Steps:</strong>
              <p style={{ margin: '4px 0 0 0', color: '#137333' }}>{Array.isArray(correct) ? correct.join(', ') : String(correct)}</p>
            </div>
          )}
          {missing && (
            <div style={{ marginTop: '5px' }}>
              <strong style={{ color: '#c5221f' }}>❌ Missing / Errors:</strong>
              <p style={{ margin: '4px 0 0 0', color: '#c5221f' }}>{Array.isArray(missing) ? missing.join(', ') : String(missing)}</p>
            </div>
          )}
          {!correct && !missing && <pre style={{ margin: 0, fontSize: '0.85rem' }}>{JSON.stringify(data, null, 2)}</pre>}
        </div>
      );
    }
    return String(data);
  };

  // اختيار قائمة المواد بناءً على البورد الحالي
  const activeSubjectList = board === 'cambridge' ? cambridgeSubjects : edexcelSubjects;

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: '750px', margin: '30px auto', padding: '25px', backgroundColor: '#ffffff', borderRadius: '16px', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
      <header style={{ textAlign: 'center', marginBottom: '25px', borderBottom: '1px solid #eee', paddingBottom: '15px' }}>
        <h1 style={{ color: currentTheme.primary, margin: '0 0 5px 0', transition: 'color 0.3s' }}>⚡ Multi-Subject AI Examiner</h1>
        <p style={{ color: '#5f6368', margin: 0 }}>Super-Fast, Context-Aware Grading</p>
      </header>

      <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginBottom: '20px' }}>
        <div style={{ flex: '2', minWidth: '250px', background: currentTheme.lightBg, padding: '15px', borderRadius: '8px', border: `1px solid ${currentTheme.border}` }}>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', color: currentTheme.primary }}>🔑 Groq API Key:</label>
          <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: `1px solid ${currentTheme.primary}`, outline: 'none' }} />
        </div>

        <div style={{ flex: '1', minWidth: '130px', background: '#f8f9fa', padding: '15px', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', color: '#333' }}>🏛️ Exam Board:</label>
          <select value={board} onChange={(e) => handleBoardChange(e.target.value as BoardType)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', fontWeight: 'bold', outline: 'none', cursor: 'pointer' }}>
            <option value="cambridge">Cambridge (CIE)</option>
            <option value="edexcel">Edexcel</option>
          </select>
        </div>

        <div style={{ flex: '1', minWidth: '180px', background: '#f8f9fa', padding: '15px', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', color: '#333' }}>📚 Subject:</label>
          <select value={subject} onChange={(e) => { setSubject(e.target.value as SubjectType); setResult(null); }} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', fontWeight: 'bold', color: currentTheme.primary, outline: 'none', cursor: 'pointer' }}>
            {activeSubjectList.map((sub) => (
              <option key={sub.id} value={sub.id}>{sub.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>1. Question:</label>
          <textarea rows={2} value={question} onChange={(e) => setQuestion(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
        </div>
        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>2. Official Mark Scheme:</label>
          <textarea rows={3} value={markScheme} onChange={(e) => setMarkScheme(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
        </div>
        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>3. Student's Answer:</label>
          <textarea rows={3} value={studentAnswer} onChange={(e) => setStudentAnswer(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
        </div>

        {error && <div style={{ background: '#fce8e6', color: '#c5221f', padding: '12px', borderRadius: '6px', fontWeight: 'bold' }}>⚠️ {error}</div>}

        <button onClick={handleGrade} disabled={loading} style={{ background: loading ? '#b0bec5' : currentTheme.primary, color: 'white', border: 'none', padding: '15px', fontSize: '1.1rem', fontWeight: 'bold', borderRadius: '8px', cursor: loading ? 'not-allowed' : 'pointer' }}>
          {loading ? 'AI Chief Examiner is Analyzing...' : `Grade ${board.toUpperCase()} ${subject.toUpperCase()} 📝`}
        </button>
      </div>

      {result && (
        <div style={{ marginTop: '35px', borderTop: '2px solid #e8eaed', paddingTop: '20px' }}>
          <h2 style={{ color: currentTheme.primary, marginBottom: '20px' }}>📊 Official Examiner Report</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ background: currentTheme.lightBg, borderLeft: `5px solid ${currentTheme.primary}`, padding: '15px', borderRadius: '6px' }}><strong>🏆 Score:</strong> <span style={{ fontSize: '1.3rem', fontWeight: 'bold' }}>{result.score}</span></div>
            <div style={{ background: '#f1f3f4', borderLeft: '5px solid #5f6368', padding: '15px', borderRadius: '6px' }}><strong>📝 Summary:</strong> {result.summary}</div>
            <div style={{ background: '#e6f4ea', borderLeft: '5px solid #137333', padding: '15px', borderRadius: '6px' }}>
              <strong>🔍 {subject.includes('math') ? 'Steps & Marks Analysis' : 'Keyword Analysis'}:</strong>
              <div style={{ marginTop: '8px' }}>{renderKeywordsAnalysis(result.keywords_analysis)}</div>
            </div>
            <div style={{ background: '#fef7e0', borderLeft: '5px solid #b06000', padding: '15px', borderRadius: '6px' }}><strong>⚠️ Verdict:</strong> {result.verdict}</div>
            <div style={{ background: '#fce8e6', borderLeft: '5px solid #c5221f', padding: '15px', borderRadius: '6px' }}><strong>💡 Tip:</strong> {result.tip}</div>
          </div>
        </div>
      )}
    </div>
  );
}