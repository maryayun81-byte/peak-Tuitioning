import sys

path = r'src\app\teacher\live\[id]\studio\StudioInterface.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the duplicate header and missing closing tags
# Find the start of the header section
header_start_marker = '<header className="min-h-20 md:min-h-24 border-b border-white/5 px-4 md:px-10 py-3 flex items-center justify-between gap-4 bg-black/40 backdrop-blur-3xl z-50">'
header_end_marker = '</header>'

h_start = content.find(header_start_marker)
h_end = content.find(header_end_marker)

if h_start == -1 or h_end == -1:
    print(f'HEADER MARKERS NOT FOUND: start={h_start} end={h_end}')
    sys.exit(1)

new_header = (
    '<header className="min-h-20 md:min-h-24 border-b border-white/5 px-4 md:px-10 py-3 flex items-center justify-between gap-4 bg-black/40 backdrop-blur-3xl z-50">\n'
    '          <div className="flex items-center gap-4 md:gap-8 min-w-0">\n'
    '            <div className="flex items-center gap-3 md:gap-4 min-w-0">\n'
    '               <div className="w-10 h-10 md:w-11 md:h-11 rounded-xl md:rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-black shadow-[0_0_30px_rgba(52,211,153,0.3)] shrink-0">\n'
    '                  <Radio size={20} className="animate-pulse" />\n'
    '               </div>\n'
    '               <div className="min-w-0">\n'
    '                  <div className="flex items-center gap-2">\n'
    '                     <h1 className="text-xs md:text-sm font-black uppercase tracking-[0.15em] leading-none truncate">{session.title}</h1>\n'
    '                     <span className="hidden xs:inline-block px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500 text-[7px] md:text-[8px] font-black uppercase tracking-widest border border-emerald-500/20">Live</span>\n'
    '                  </div>\n'
    '                  <div className="flex items-center gap-2 mt-1 md:mt-1.5 truncate">\n'
    '                     <span className="text-[8px] md:text-[9px] font-bold text-slate-500 uppercase tracking-widest truncate">{session.subject?.name}</span>\n'
    '                     <div className="hidden xs:block w-1 h-1 rounded-full bg-white/10" />\n'
    '                     <span className="hidden xs:block text-[8px] md:text-[9px] font-bold text-slate-500 uppercase tracking-widest truncate">{session.class?.name}</span>\n'
    '                  </div>\n'
    '               </div>\n'
    '            </div>\n'
    '          </div>\n'
    '\n'
    '          <div className="flex items-center justify-end gap-2 md:gap-4 shrink-0">\n'
    '             <div className="hidden lg:flex items-center gap-8 mr-4">\n'
    '                 <LiveAudienceStat />\n'
    '                 <LiveUpstreamStat />\n'
    '                 <SessionUptime />\n'
    '              </div>\n'
    '             <MobileAudienceStat />\n'
    '             <Link\n'
    '               href="/teacher/live"\n'
    '               target="_blank"\n'
    '               className="hidden sm:flex px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 transition-all text-[9px] font-black uppercase tracking-widest"\n'
    '             >\n'
    '               Schedule Next\n'
    '             </Link>\n'
    '             <div className="hidden md:block h-10 w-px bg-white/10" />\n'
    '             <EndSessionButton session={session} outcomes={sessionOutcomes} />\n'
    '          </div>'
)

new_content = content[:h_start] + new_header + content[h_end:]

with open(path, 'w', encoding='utf-8') as f:
    f.write(new_content)

print(f'FIXED HEADER OK - file length: {len(new_content)}')
