'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { 
  Users, Award, CheckCircle, XCircle, 
  BarChart2, PieChart as PieIcon, Filter, 
  Download, Search, ChevronLeft,
  Trophy, TrendingUp, TrendingDown,
  Clock, Target
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Card, StatCard, Badge } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { SkeletonDashboard } from '@/components/ui/Skeleton'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, 
  ResponsiveContainer, PieChart, Pie, Cell, Legend 
} from 'recharts'
import toast from 'react-hot-toast'
import { formatDate } from '@/lib/utils'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

export default function TeacherQuizResults() {
  const { id } = useParams()
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  
  const [loading, setLoading] = useState(true)
  const [quiz, setQuiz] = useState<any>(null)
  const [attempts, setAttempts] = useState<any[]>([])
  const [missingStudents, setMissingStudents] = useState<any[]>([])
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [selectedAttempt, setSelectedAttempt] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<'submissions' | 'missing'>('submissions')

  useEffect(() => {
    loadData()
  }, [id])

  const loadData = async () => {
    setLoading(true)
    const { data: quizData } = await supabase
      .from('quizzes')
      .select('*, class:classes(id, name), subject:subjects(name)')
      .eq('id', id)
      .single()
    
    const { data: attemptData } = await supabase
      .from('quiz_attempts')
      .select('*, student:students(id, full_name, class:classes(name))')
      .eq('quiz_id', id)
      .order('completed_at', { ascending: false })
      
    let unattempted: any[] = []
    if (quizData.audience === 'all_classes') {
        const { data: allStudents } = await supabase.from('students').select('id, full_name, class:classes(name)')
        unattempted = (allStudents || []).filter(s => !attemptData?.some(a => a.student_id === s.id))
    } else if (quizData.class_id) {
        const { data: classStudents } = await supabase.from('students').select('id, full_name, class:classes(name)').eq('class_id', quizData.class_id)
        unattempted = (classStudents || []).filter(s => !attemptData?.some(a => a.student_id === s.id))
    }
    
    setQuiz(quizData)
    setAttempts(attemptData || [])
    setMissingStudents(unattempted)
    setLoading(false)
  }

  // Analytics Calculations
  const completedCount = attempts.length
  const avgScore = attempts.length > 0 ? Math.round(attempts.reduce((acc, a) => acc + (a.percentage || 0), 0) / attempts.length) : 0
  const passCount = attempts.filter(a => a.result === 'pass').length
  const failCount = attempts.filter(a => a.result === 'fail').length
  const passRate = attempts.length > 0 ? Math.round((passCount / attempts.length) * 100) : 0
  const highestScore = attempts.length > 0 ? Math.max(...attempts.map(a => a.percentage)) : 0

  // Chart Data
  const scoreDist = [
    { range: '0-20', count: attempts.filter(a => a.percentage < 20).length },
    { range: '20-40', count: attempts.filter(a => a.percentage >= 20 && a.percentage < 40).length },
    { range: '40-60', count: attempts.filter(a => a.percentage >= 40 && a.percentage < 60).length },
    { range: '60-80', count: attempts.filter(a => a.percentage >= 60 && a.percentage < 80).length },
    { range: '80-100', count: attempts.filter(a => a.percentage >= 80).length },
  ]

  const pieData = [
    { name: 'Passed', value: passCount, color: '#10B981' },
    { name: 'Failed', value: failCount, color: '#EF4444' },
  ]

  const filteredAttempts = attempts.filter(a => {
    const matchesSearch = a.student?.full_name?.toLowerCase().includes(search.toLowerCase())
    if (!matchesSearch) return false
    if (filter === 'all') return true
    if (filter === 'passed') return a.result === 'pass'
    if (filter === 'failed') return a.result === 'fail'
    return true
  })

  const exportCSV = () => {
    const headers = ['Student Name', 'Class', 'Score (%)', 'Result', 'Attempts', 'Date']
    const rows = attempts.map(a => [
      a.student?.full_name,
      a.student?.class?.name,
      a.percentage,
      a.result?.toUpperCase(),
      a.attempt_number,
      formatDate(a.completed_at)
    ])

    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n" 
      + rows.map(e => e.join(",")).join("\n")

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `${quiz?.title || 'quiz'}_results.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const exportPDF = async () => {
    const element = document.getElementById('quiz-report-content')
    if (!element) return
    
    toast.loading('Generating PDF...')
    try {
      const canvas = await html2canvas(element, { scale: 2 })
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      const imgProps = pdf.getImageProperties(imgData)
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
      pdf.save(`${quiz?.title || 'quiz'}_report.pdf`)
      toast.dismiss()
      toast.success('PDF Exported!')
    } catch (error) {
       console.error(error)
       toast.dismiss()
       toast.error('PDF Export failed')
    }
  }

  if (loading) return <SkeletonDashboard />

  return (
    <div className="p-6 space-y-8 pb-32">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
         <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-[var(--input)] transition-colors">
               <ChevronLeft size={20} />
            </button>
            <div>
               <h1 className="text-2xl font-black text-[var(--text)]">{quiz?.title}</h1>
               <div className="flex items-center gap-2 mt-1">
                  <Badge variant="muted">{quiz?.class?.name}</Badge>
                  <Badge variant="info">{quiz?.subject?.name}</Badge>
               </div>
            </div>
         </div>
         <div className="flex gap-2">
            <Button variant="secondary" onClick={exportCSV}><Download size={16} className="mr-2" /> CSV</Button>
            <Button variant="secondary" onClick={exportPDF}><Download size={16} className="mr-2" /> PDF Report</Button>
            <Button variant="primary" onClick={loadData}>Refresh</Button>
         </div>
      </div>

      <div id="quiz-report-content" className="space-y-8">

      {/* Overview Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
         <StatCard title="Total Completed" value={completedCount} icon={<Users size={20} />} />
         <StatCard title="Average Score" value={`${avgScore}%`} icon={<Target size={20} />} />
         <StatCard title="Highest Score" value={`${highestScore}%`} icon={<Trophy size={20} />} />
         <StatCard 
            title="Pass Rate" 
            value={`${passRate}%`} 
            icon={passRate >= 70 ? <TrendingUp size={20} /> : <TrendingDown size={20} />} 
            change={passRate >= 70 ? "Healthy" : "Watch out"}
            changeType={passRate >= 70 ? "up" : "down"}
         />
      </div>

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         <Card className="lg:col-span-2 p-6">
            <h3 className="font-bold text-sm mb-6 flex items-center gap-2"><BarChart2 size={16} /> Score Distribution</h3>
            <div className="h-64 mt-4">
               <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={scoreDist}>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--card-border)" />
                     <XAxis dataKey="range" axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                     <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                     <ReTooltip 
                        contentStyle={{ background: 'var(--card)', border: '1px solid var(--card-border)', borderRadius: '12px' }}
                        cursor={{ fill: 'var(--input)', opacity: 0.4 }}
                     />
                     <Bar dataKey="count" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                  </BarChart>
               </ResponsiveContainer>
            </div>
         </Card>

         <Card className="p-6">
            <h3 className="font-bold text-sm mb-6 flex items-center gap-2"><PieIcon size={16} /> Pass vs Fail</h3>
            <div className="h-64 flex flex-col items-center justify-center">
               <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                     <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                     >
                        {pieData.map((entry, index) => (
                           <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                     </Pie>
                     <ReTooltip />
                     <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
               </ResponsiveContainer>
            </div>
         </Card>
      </div>

      {/* Student List & Monitoring */}
      <Card className="p-6">
         <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <h2 className="font-bold text-lg flex items-center gap-2">
               <Users size={20} /> Student Monitoring
            </h2>
            <div className="flex gap-2 p-1 bg-[var(--input)] rounded-lg">
                <button onClick={() => setActiveTab('submissions')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-colors ${activeTab === 'submissions' ? 'bg-[var(--card)] shadow text-primary' : 'text-[var(--text-muted)] hover:text-[var(--text)]'}`}>Submissions</button>
                <button onClick={() => setActiveTab('missing')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-colors ${activeTab === 'missing' ? 'bg-[var(--card)] shadow text-danger' : 'text-[var(--text-muted)] hover:text-[var(--text)]'}`}>Missing ({missingStudents.length})</button>
            </div>
         </div>
         
         {activeTab === 'submissions' ? (
             <div className="space-y-4">
                 <div className="flex flex-wrap items-center gap-3">
                    <div className="w-full md:w-64">
                       <Input 
                          placeholder="Search student..." 
                          value={search} 
                          onChange={e => setSearch(e.target.value)} 
                          leftIcon={<Search size={16} />} 
                       />
                    </div>
                    <Select className="w-40" value={filter} onChange={e => setFilter(e.target.value)}>
                       <option value="all">All Results</option>
                       <option value="passed">Passed</option>
                       <option value="failed">Failed</option>
                    </Select>
                 </div>
                 
                 <div className="overflow-x-auto w-full pb-4">
            <table className="w-full min-w-[800px] text-left">
               <thead>
                  <tr className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] border-b border-[var(--card-border)]">
                     <th className="pb-4 font-black">Student Name</th>
                     <th className="pb-4 font-black">Class</th>
                     <th className="pb-4 font-black text-center">Score</th>
                     <th className="pb-4 font-black text-center">Attempts</th>
                     <th className="pb-4 font-black text-center">Result</th>
                     <th className="pb-4 font-black text-right">Date</th>
                     <th className="pb-4 font-black"></th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-[var(--card-border)]">
                  {filteredAttempts.map((a) => (
                     <tr key={a.id} className="group hover:bg-[var(--input)]/50 transition-colors">
                        <td className="py-4 font-bold text-sm text-[var(--text)]">{a.student?.full_name}</td>
                        <td className="py-4 text-xs text-[var(--text-muted)]">{a.student?.class?.name}</td>
                        <td className="py-4 text-center">
                           <span className={`font-black ${a.result === 'pass' ? 'text-emerald-500' : 'text-rose-500'}`}>
                              {a.percentage}%
                           </span>
                        </td>
                        <td className="py-4 text-center">
                           <Badge variant="muted">{a.attempt_number}</Badge>
                        </td>
                        <td className="py-4 flex justify-center">
                           {a.result === 'pass' ? (
                              <Badge variant="success" className="flex items-center gap-1"><CheckCircle size={10} /> Pass</Badge>
                           ) : (
                              <Badge variant="danger" className="flex items-center gap-1"><XCircle size={10} /> Fail</Badge>
                           )}
                        </td>
                        <td className="py-4 text-right text-xs text-[var(--text-muted)]">
                           {formatDate(a.completed_at)}
                        </td>
                        <td className="py-4 text-right">
                           <Button variant="ghost" size="sm" onClick={() => setSelectedAttempt(a)}>Review</Button>
                        </td>
                     </tr>
                  ))}
                  {filteredAttempts.length === 0 && (
                     <tr>
                        <td colSpan={6} className="py-20 text-center text-[var(--text-muted)] italic">
                           No records found matching your filters.
                        </td>
                     </tr>
                  )}
               </tbody>
                </table>
             </div>
         </div>
         ) : (
             <div className="overflow-x-auto mt-6">
                <table className="w-full text-left">
                   <thead>
                      <tr className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] border-b border-[var(--card-border)]">
                         <th className="pb-4 font-black">Student Name</th>
                         <th className="pb-4 font-black">Class</th>
                         <th className="pb-4 font-black">Status</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-[var(--card-border)]">
                      {missingStudents.map(s => (
                         <tr key={s.id} className="hover:bg-[var(--input)]/50 transition-colors">
                            <td className="py-4 font-bold text-sm text-[var(--text)]">{s.full_name}</td>
                            <td className="py-4 text-xs text-[var(--text-muted)]">{s.class?.name || 'Unassigned'}</td>
                            <td className="py-4"><Badge variant="danger">Not Attempted</Badge></td>
                         </tr>
                      ))}
                      {missingStudents.length === 0 && (
                         <tr><td colSpan={3} className="py-10 text-center text-[var(--text-muted)] italic">All assigned students have submitted! 🎉</td></tr>
                      )}
                   </tbody>
                </table>
             </div>
         )}
      </Card>
      </div>

      {/* Detailed Review Modal */}
      <Modal 
        isOpen={!!selectedAttempt} 
        onClose={() => setSelectedAttempt(null)}
        title={`Review: ${selectedAttempt?.student?.full_name}`}
        size="lg"
      >
        <div className="space-y-6 max-h-[80vh] overflow-y-auto p-1">
           <div className="flex items-center justify-between p-4 rounded-2xl bg-[var(--input)]/50 border border-[var(--card-border)] mb-6">
              <div>
                 <div className="text-[10px] font-bold text-muted uppercase tracking-widest">Score Achieved</div>
                 <div className="text-2xl font-black text-primary">{selectedAttempt?.percentage}%</div>
              </div>
              <Badge variant={selectedAttempt?.result === 'pass' ? 'success' : 'danger'}>
                 {selectedAttempt?.result === 'pass' ? 'Passed' : 'Failed'}
              </Badge>
           </div>

           <div className="space-y-4">
              {quiz?.questions?.map((q: any, idx: number) => {
                 const studentAns = selectedAttempt?.answers?.[q.id]
                 const grading = selectedAttempt?.grading_details?.[q.id]
                 const isCorrect = grading ? grading.score === grading.max : (q.type === 'multiple_answer' ? (Array.isArray(studentAns) && q.correct_answers?.every((ca: string) => studentAns.includes(ca)) && studentAns.every((sa: string) => q.correct_answers?.includes(sa))) : studentAns === q.correct_answer)

                 return (
                    <Card key={q.id} className={`p-4 border-l-4 ${isCorrect ? 'border-emerald-500' : 'border-rose-500'}`}>
                       <div className="flex justify-between items-start gap-3 mb-4">
                          <h4 className="font-bold text-sm leading-tight">{idx + 1}. {q.text}</h4>
                          {isCorrect ? <CheckCircle size={14} className="text-emerald-500 shrink-0" /> : <XCircle size={14} className="text-rose-500 shrink-0" />}
                       </div>
                       
                       <div className="space-y-2 text-xs">
                          <div className="flex items-center gap-2">
                             <span className="text-muted w-16">Answer:</span>
                             <span className={isCorrect ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                                {Array.isArray(studentAns) ? studentAns.join(', ') : (studentAns || 'No Answer')}
                             </span>
                          </div>
                          {!isCorrect && (
                             <div className="flex items-center gap-2">
                                <span className="text-muted w-16">Correct:</span>
                                <span className="text-emerald-600 font-bold">
                                   {q.correct_answer || q.correct_answers?.join(', ')}
                                </span>
                             </div>
                          )}
                       </div>
                    </Card>
                 )
              })}
           </div>
        </div>
      </Modal>
    </div>
  )
}
