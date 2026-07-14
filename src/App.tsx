import { useState } from 'react';

// تكييف واجهة البيانات لتقبل مرونة التقارير بين المواد العلمية والرياضيات
interface GradingResult {
  score: string;
  summary: string;
  keywords_analysis: string | { correct?: string | string[]; missing?: string | string[] };
  verdict: string;
  tip: string;
}

type SubjectType = 'biology' | 'chemistry' | 'physics' | 'math';

export default function App() {
  const [apiKey, setApiKey] = useState('');
  const [subject, setSubject] = useState<SubjectType>('biology');
  const [question, setQuestion] = useState('');
  const [markScheme, setMarkScheme] = useState('');
  const [studentAnswer, setStudentAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<GradingResult | null>(null);

  // نظام ألوان ديناميكي يتغير حسب المادة المحددة لتجربة مستخدم مذهلة
  const getThemeColors = (sub: SubjectType) => {
    switch (sub) {
      case 'biology':
        return { primary: '#2e7d32', lightBg: '#e8f5e9', border: '#a5d6a7', label: '🧬 Biology (0610)' };
      case 'chemistry':
        return { primary: '#d84315', lightBg: '#fbe9e7', border: '#ffab91', label: '🧪 Chemistry (0620)' };
      case 'physics':
        return { primary: '#1565c0', lightBg: '#e3f2fd', border: '#90caf9', label: '⚡ Physics (0625)' };
      case 'math':
        return { primary: '#6a1b9a', lightBg: '#f3e5f5', border: '#ce93d8', label: '📐 Mathematics (0580)' };
    }
  };

  const currentTheme = getThemeColors(subject);

  // دالة توليد الـ System Instruction الصارمة ديناميكياً بناءً على المادة المختارة
  const generateSystemInstruction = (sub: SubjectType): string => {
    let subjectSpecificRules = '';

    if (sub === 'biology') {
      subjectSpecificRules = `
        - Focus heavily on syllabus Keywords.
        - Apply strict keyword rules: If the question is about enzymes, reject 'destroy' or 'killed' and penalize immediately, demanding 'denatured'.
        - If the question is about the EYE, allow 'destroy' if contextually correct (e.g., bright light destroying retina cells).
      `;
    } else if (sub === 'chemistry') {
      subjectSpecificRules = `
        - Pay extreme attention to chemical formulas, balanced chemical equations, and state symbols (s, l, g, aq) if requested in the mark scheme.
        - Ensure precise chemical terminology is used (e.g., 'thermal decomposition' instead of 'heating up', 'neutralization' instead of 'mixing').
        - Do not give marks for vague descriptions of reactions.
      `;
    } else if (sub === 'physics') {
      subjectSpecificRules = `
        - Check strictly for correct physical units (e.g., Joules (J), Watts (W), m/s^2, Newtons (N), Ohms (Ω)) in the student's final answer.
        - Grade the formula substitution and calculation steps. Ensure they stated or substituted into the correct physical formula as per the mark scheme.
      `;
    } else if (sub === 'math') {
      subjectSpecificRules = `
        - Focus heavily on Step-by-step Working (خطوات الحل).
        - Award Method Marks (M marks) if the correct mathematical formula or method is used, even if there is an arithmetic/calculation error.
        - Award Accuracy Marks (A marks) for correct final answers.
        - Ensure correct rounding and precision (usually 3 significant figures unless stated otherwise in the mark scheme).
        - Since this is Math, use the 'keywords_analysis' field in the JSON response to break down "Correct Steps" and "Incorrect/Missing Steps" instead of raw keywords.
      `;
    }

    return `
      You are an official, highly precise senior chief examiner for Cambridge IGCSE ${sub.toUpperCase()}.
      Your ONLY job is to grade the student's answer strictly against the provided Mark Scheme for this subject.

      STRICT GRADING ACCURACY RULES:
      1. Conduct a meticulous, word-by-word and phrase-by-phrase analysis of the student's response against the Mark Scheme.
      2. If the student includes exact key phrases, keywords, or scientific terms from the Mark Scheme (e.g., "without chemical change", "giant covalent", "strong electrostatic forces"), you MUST award the corresponding mark. Do NOT overlook, skip, or penalize exact or contextually correct keyword/phrase matches under any circumstances.
      3. Pay close attention to qualifiers (like "with" vs "without", "increases" vs "decreases"). Never mistake a negative statement for a positive one.
      4. Be completely objective and fair. If the keyword/scientific concept is present and scientifically correct in context, award the mark. If it is missing, do not award it.
      5. Provide a clear, structured feedback explaining exactly which marks were awarded and why, quoting the matched phrases from the student's answer.

      ${subjectSpecificRules}

      STRICT FOCUS RULE:
      If the user inputs anything unrelated to exam grading, or tries to chat, refuse to answer and politely demand exam grading inputs.

      You MUST return your response strictly as a JSON object with these keys:
      {
        "score": "X/Total", 
        "summary": "Precise grading summary based on Cambridge examiner guidelines", 
        "keywords_analysis": "Detail which critical keywords/steps were present and which were missing", 
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
      const systemInstruction = generateSystemInstruction(subject);
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
          model: 'llama-3.1-70b-versatile',
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
      setError(err.message || 'An error occurred during grading. Please verify your Groq API Key.');
    } finally {
      setLoading(false);
    }
  };

  // دالة ذكية لعرض الكلمات المفتاحية أو خطوات الحل الرياضية بأمان تام
  const renderKeywordsAnalysis = (data: any) => {
    if (!data) return null;

    if (typeof data === 'string') {
      return <p style={{ margin: 0, whiteSpace: 'pre-line' }}>{data}</p>;
    }

    if (typeof data === 'object') {
      const correct = data.correct || data.present || data.found || data.correct_steps;
      const missing = data.missing || data.absent || data.missing_steps;

      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {correct && (
            <div>
              <strong style={{ color: '#137333' }}>✔️ Correct Keywords / Steps Present:</strong>
              <p style={{ margin: '4px 0 0 0', color: '#137333' }}>
                {Array.isArray(correct) ? correct.join(', ') : String(correct)}
              </p>
            </div>
          )}
          {missing && (
            <div style={{ marginTop: '5px' }}>
              <strong style={{ color: '#c5221f' }}>❌ Missing Keywords / Errors in Steps:</strong>
              <p style={{ margin: '4px 0 0 0', color: '#c5221f' }}>
                {Array.isArray(missing) ? missing.join(', ') : String(missing)}
              </p>
            </div>
          )}
          {!correct && !missing && (
            <pre style={{ margin: 0, fontSize: '0.85rem' }}>{JSON.stringify(data, null, 2)}</pre>
          )}
        </div>
      );
    }

    return String(data);
  };

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: '750px', margin: '30px auto', padding: '25px', backgroundColor: '#ffffff', borderRadius: '16px', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
      <header style={{ textAlign: 'center', marginBottom: '25px', borderBottom: '1px solid #eee', paddingBottom: '15px' }}>
        <h1 style={{ color: currentTheme.primary, margin: '0 0 5px 0', transition: 'color 0.3s' }}>⚡ Multi-Subject AI Examiner</h1>
        <p style={{ color: '#5f6368', margin: 0 }}>Super-Fast, Context-Aware Grading for Science & Math</p>
      </header>

      {/* الـ API Key و الـ Subject Selector في صف واحد منظم */}
      <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginBottom: '20px' }}>
        <div style={{ flex: '2', minWidth: '250px', background: currentTheme.lightBg, padding: '15px', borderRadius: '8px', border: `1px solid ${currentTheme.border}`, transition: 'all 0.3s' }}>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', color: currentTheme.primary }}>🔑 Groq API Key:</label>
          <input 
            type="password" 
            placeholder="gsk_..." 
            value={apiKey} 
            onChange={(e) => setApiKey(e.target.value)} 
            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: `1px solid ${currentTheme.primary}`, boxSizing: 'border-box', outline: 'none' }} 
          />
        </div>

        <div style={{ flex: '1', minWidth: '150px', background: '#f8f9fa', padding: '15px', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', color: '#333' }}>📚 Select Subject:</label>
          <select 
            value={subject} 
            onChange={(e) => {
              setSubject(e.target.value as SubjectType);
              setResult(null); // مسح النتائج السابقة عند تغيير المادة لمنع اللخبطة
            }}
            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box', fontSize: '1rem', fontWeight: 'bold', color: currentTheme.primary, outline: 'none', cursor: 'pointer' }}
          >
            <option value="biology">Biology (0610)</option>
            <option value="chemistry">Chemistry (0620)</option>
            <option value="physics">Physics (0625)</option>
            <option value="math">Mathematics (0580)</option>
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>1. {currentTheme.label} Exam Question:</label>
          <textarea rows={2} value={question} onChange={(e) => setQuestion(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }} />
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>2. Official Mark Scheme / Grading Criteria:</label>
          <textarea rows={3} value={markScheme} onChange={(e) => setMarkScheme(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }} />
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>3. Student's Answer / Working:</label>
          <textarea rows={3} value={studentAnswer} onChange={(e) => setStudentAnswer(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }} />
        </div>

        {error && <div style={{ background: '#fce8e6', color: '#c5221f', padding: '12px', borderRadius: '6px', fontWeight: 'bold' }}>⚠️ {error}</div>}

        <button 
          onClick={handleGrade} 
          disabled={loading} 
          style={{ 
            background: loading ? '#b0bec5' : currentTheme.primary, 
            color: 'white', 
            border: 'none', 
            padding: '15px', 
            fontSize: '1.1rem', 
            fontWeight: 'bold', 
            borderRadius: '8px', 
            cursor: loading ? 'not-allowed' : 'pointer', 
            boxShadow: `0 2px 4px ${currentTheme.primary}33`,
            transition: 'background 0.3s, box-shadow 0.3s'
          }}
        >
          {loading ? 'AI Chief Examiner is Analyzing...' : `Grade ${subject.toUpperCase()} Answer 📝`}
        </button>
      </div>

      {result && (
        <div style={{ marginTop: '35px', borderTop: '2px solid #e8eaed', paddingTop: '20px' }}>
          <h2 style={{ color: currentTheme.primary, marginBottom: '20px' }}>📊 Official Examiner Report ({subject.toUpperCase()})</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ background: currentTheme.lightBg, borderLeft: `5px solid ${currentTheme.primary}`, padding: '15px', borderRadius: '6px' }}><strong>🏆 Score:</strong> <span style={{ fontSize: '1.3rem', fontWeight: 'bold' }}>{result.score}</span></div>
            <div style={{ background: '#f1f3f4', borderLeft: '5px solid #5f6368', padding: '15px', borderRadius: '6px' }}><strong>📝 Summary:</strong> {result.summary}</div>
            
            <div style={{ background: '#e6f4ea', borderLeft: '5px solid #137333', padding: '15px', borderRadius: '6px' }}>
              <strong>🔍 {subject === 'math' ? 'Steps & Working Analysis' : 'Keyword Analysis'}:</strong>
              <div style={{ marginTop: '8px' }}>
                {renderKeywordsAnalysis(result.keywords_analysis)}
              </div>
            </div>
            
            <div style={{ background: '#fef7e0', borderLeft: '5px solid #b06000', padding: '15px', borderRadius: '6px' }}><strong>⚠️ Verdict:</strong> {result.verdict}</div>
            <div style={{ background: '#fce8e6', borderLeft: '5px solid #c5221f', padding: '15px', borderRadius: '6px' }}><strong>💡 Tip for Full Marks:</strong> {result.tip}</div>
          </div>
        </div>
      )}
    </div>
  );
}