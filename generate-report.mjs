import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, WidthType, ShadingType, PageBreak,
} from 'docx';
import { writeFileSync } from 'fs';

// ─── 색상 상수 ────────────────────────────────────────────────────────────────
const C = {
  HEADER_BG:  '2F5496',
  HEADER_FG:  'FFFFFF',
  ALT_ROW:    'D9E1F2',
  GANTT_DONE: '4472C4',
  GANTT_PLAN: 'BDD7EE',
  PASS_BG:    'C6EFCE',
  FAIL_BG:    'FFC7CE',
  LABEL_BG:   'E2EFDA',
  WHITE:      'FFFFFF',
};

// ─── 유틸 함수 ────────────────────────────────────────────────────────────────
const h1 = (text) => new Paragraph({
  children: [new TextRun({ text, bold: true, size: 32, color: C.HEADER_BG, font: '맑은 고딕' })],
  spacing: { before: 400, after: 200 },
  border: { bottom: { value: 'single', size: 6, color: C.HEADER_BG, space: 1 } },
});

const h2 = (text) => new Paragraph({
  children: [new TextRun({ text, bold: true, size: 26, color: '2E74B5', font: '맑은 고딕' })],
  spacing: { before: 300, after: 150 },
});

const pageBreak = () => new Paragraph({ children: [new PageBreak()] });

const txt = (text, opts = {}) =>
  new TextRun({ text, size: 20, font: '맑은 고딕', ...opts });

const cell = (text, { shade, bold, align, width, span, size } = {}) =>
  new TableCell({
    children: [new Paragraph({
      children: [new TextRun({ text: text ?? '', bold: bold ?? false, size: size ?? 20, font: '맑은 고딕' })],
      alignment: align ?? AlignmentType.LEFT,
    })],
    shading: shade ? { fill: shade, type: ShadingType.SOLID } : undefined,
    width: width ? { size: width, type: WidthType.DXA } : undefined,
    columnSpan: span,
  });

const headerRow = (cols) => new TableRow({
  tableHeader: true,
  children: cols.map(({ text, width }) =>
    cell(text, { shade: C.HEADER_BG, bold: true, align: AlignmentType.CENTER, width, size: 18 })
  ),
});

const dataRow = (cols, isAlt = false) => new TableRow({
  children: cols.map(({ text, align, bold, shade, width, span }) =>
    cell(text, {
      shade: shade ?? (isAlt ? C.ALT_ROW : undefined),
      bold, align, width, span,
    })
  ),
});

// ─── 데이터 ──────────────────────────────────────────────────────────────────

const programs = [
  { id: 'AUTH-001', l1: '인증', l2: '이메일 인증', l3: '',      name: '이메일 인증 코드 발송/확인',       tables: 'users',                                            mgr: '미정' },
  { id: 'AUTH-002', l1: '인증', l2: '회원가입',   l3: '',      name: '회원가입',                         tables: 'users',                                            mgr: '미정' },
  { id: 'AUTH-003', l1: '인증', l2: '로그인',     l3: '',      name: '로그인',                           tables: 'users, refresh_tokens',                            mgr: '미정' },
  { id: 'AUTH-004', l1: '인증', l2: '토큰 관리',  l3: '',      name: '토큰 갱신 및 로그아웃',             tables: 'refresh_tokens',                                   mgr: '미정' },
  { id: 'USR-001',  l1: '사용자', l2: '프로필',   l3: '조회',  name: '내 프로필 조회',                   tables: 'users',                                            mgr: '미정' },
  { id: 'USR-002',  l1: '사용자', l2: '프로필',   l3: '수정',  name: '프로필 수정',                      tables: 'users',                                            mgr: '미정' },
  { id: 'USR-003',  l1: '사용자', l2: '프로필',   l3: '이미지',name: '프로필 이미지 업로드',              tables: 'users',                                            mgr: '미정' },
  { id: 'USR-004',  l1: '사용자', l2: '비밀번호', l3: '',      name: '비밀번호 변경',                    tables: 'users',                                            mgr: '미정' },
  { id: 'MATCH-001',l1: '1:1 매칭', l2: '카드',   l3: '',     name: '매칭 카드 목록 조회',               tables: 'users, swipes',                                    mgr: '미정' },
  { id: 'MATCH-002',l1: '1:1 매칭', l2: '스와이프',l3: '',    name: '좋아요/패스 처리',                  tables: 'swipes, matches, chat_rooms, chat_room_members',   mgr: '미정' },
  { id: 'MATCH-003',l1: '1:1 매칭', l2: '매칭 목록',l3: '',   name: '매칭된 사용자 목록 조회',           tables: 'matches, users',                                   mgr: '미정' },
  { id: 'GRP-001',  l1: '과팅 매칭', l2: '그룹방', l3: '목록', name: '그룹방 목록 조회',                 tables: 'group_rooms, group_room_members',                   mgr: '미정' },
  { id: 'GRP-002',  l1: '과팅 매칭', l2: '그룹방', l3: '생성', name: '그룹방 생성',                      tables: 'group_rooms, group_room_members',                   mgr: '미정' },
  { id: 'GRP-003',  l1: '과팅 매칭', l2: '그룹방', l3: '참여', name: '그룹방 참여/나가기',               tables: 'group_rooms, group_room_members',                   mgr: '미정' },
  { id: 'GRP-004',  l1: '과팅 매칭', l2: '그룹방', l3: '신청', name: '과팅 신청',                        tables: 'group_rooms, chat_rooms, chat_room_members',        mgr: '미정' },
  { id: 'GRP-005',  l1: '과팅 매칭', l2: '그룹방', l3: '관리', name: '그룹방 해체/매칭 취소',            tables: 'group_rooms, group_room_members, chat_rooms',       mgr: '미정' },
  { id: 'CHAT-001', l1: '채팅', l2: '채팅방',     l3: '목록',  name: '채팅방 목록 조회',                 tables: 'chat_rooms, chat_room_members, messages',           mgr: '미정' },
  { id: 'CHAT-002', l1: '채팅', l2: '메시지',     l3: '조회',  name: '메시지 조회 (페이지네이션)',        tables: 'messages',                                         mgr: '미정' },
  { id: 'CHAT-003', l1: '채팅', l2: '메시지',     l3: '전송',  name: '실시간 메시지 전송',               tables: 'messages',                                         mgr: '미정' },
  { id: 'CHAT-004', l1: '채팅', l2: '채팅방',     l3: '설정',  name: '채팅방 설정 (이름 변경/나가기)',   tables: 'chat_rooms, chat_room_members',                     mgr: '미정' },
  { id: 'CHAT-005', l1: '채팅', l2: '차단',       l3: '',      name: '사용자 차단',                      tables: 'user_blocks, chat_room_members',                    mgr: '미정' },
  { id: 'APPT-001', l1: '약속', l2: '제안/조회',  l3: '',      name: '약속 제안 및 목록 조회',            tables: 'appointments',                                     mgr: '미정' },
  { id: 'APPT-002', l1: '약속', l2: '상태 관리',  l3: '',      name: '약속 확정/취소',                   tables: 'appointments',                                     mgr: '미정' },
  { id: 'SUPP-001', l1: '고객센터', l2: '문의',   l3: '제출',  name: '문의 제출',                        tables: 'support_inquiries',                                mgr: '미정' },
  { id: 'SUPP-002', l1: '고객센터', l2: '문의',   l3: '조회',  name: '문의 내역 조회',                   tables: 'support_inquiries',                                mgr: '미정' },
];

const features = [
  { pid:'AUTH-001', fid:'AUTH-001-F01', l1:'인증', l2:'이메일 인증', l3:'발송',    name:'인증 코드 발송',      desc:'학교 이메일(@yeonsung.ac.kr)로 6자리 인증 코드 발송, 유효시간 5분',       mgr:'미정', done:'완료' },
  { pid:'AUTH-001', fid:'AUTH-001-F02', l1:'인증', l2:'이메일 인증', l3:'확인',    name:'인증 코드 확인',      desc:'사용자 입력 코드 유효성 검증 (5분 내 일치 여부)',                          mgr:'미정', done:'완료' },
  { pid:'AUTH-002', fid:'AUTH-002-F01', l1:'인증', l2:'회원가입',   l3:'',         name:'회원가입',           desc:'인증 완료 후 닉네임, 학번, 학과, 학년, 성별, 비밀번호 입력하여 계정 생성',  mgr:'미정', done:'완료' },
  { pid:'AUTH-003', fid:'AUTH-003-F01', l1:'인증', l2:'로그인',     l3:'',         name:'로그인',             desc:'이메일/비밀번호 검증, JWT Access Token(15분)·Refresh Token(7일) 발급',    mgr:'미정', done:'완료' },
  { pid:'AUTH-004', fid:'AUTH-004-F01', l1:'인증', l2:'토큰 관리',  l3:'갱신',     name:'토큰 갱신',          desc:'Refresh Token 검증 후 새 Access Token 발급',                             mgr:'미정', done:'완료' },
  { pid:'AUTH-004', fid:'AUTH-004-F02', l1:'인증', l2:'토큰 관리',  l3:'로그아웃', name:'로그아웃',           desc:'Refresh Token DB 삭제 및 쿠키 초기화',                                   mgr:'미정', done:'완료' },
  { pid:'USR-001',  fid:'USR-001-F01',  l1:'사용자', l2:'프로필',   l3:'내 조회',  name:'내 프로필 조회',     desc:'인증된 사용자의 전체 프로필 정보 반환',                                    mgr:'미정', done:'완료' },
  { pid:'USR-001',  fid:'USR-001-F02',  l1:'사용자', l2:'프로필',   l3:'상대 조회',name:'타 사용자 조회',     desc:'userId 기반 상대방 공개 프로필 반환',                                     mgr:'미정', done:'완료' },
  { pid:'USR-002',  fid:'USR-002-F01',  l1:'사용자', l2:'프로필',   l3:'수정',     name:'프로필 수정',        desc:'닉네임, 자기소개, MBTI, 관심사 수정 후 소켓 브로드캐스트',                  mgr:'미정', done:'완료' },
  { pid:'USR-003',  fid:'USR-003-F01',  l1:'사용자', l2:'프로필',   l3:'이미지',   name:'이미지 업로드',      desc:'Multer 처리, /uploads/profiles/ 저장, profile_image URL 반환',            mgr:'미정', done:'완료' },
  { pid:'USR-004',  fid:'USR-004-F01',  l1:'사용자', l2:'비밀번호', l3:'',         name:'비밀번호 변경',      desc:'현재 비밀번호 검증 후 bcrypt 해싱하여 새 비밀번호 저장',                    mgr:'미정', done:'완료' },
  { pid:'MATCH-001',fid:'MATCH-001-F01',l1:'1:1 매칭', l2:'카드',   l3:'조회',     name:'매칭 카드 조회',     desc:'반대 성별 중 미스와이프 사용자 프로필 카드 목록 반환 (랜덤 정렬)',            mgr:'미정', done:'완료' },
  { pid:'MATCH-002',fid:'MATCH-002-F01',l1:'1:1 매칭', l2:'스와이프',l3:'좋아요',  name:'좋아요',             desc:'swipes 기록 저장, 상호 좋아요 시 matches 생성 및 1:1 채팅방 자동 개설',    mgr:'미정', done:'완료' },
  { pid:'MATCH-002',fid:'MATCH-002-F02',l1:'1:1 매칭', l2:'스와이프',l3:'패스',    name:'패스',               desc:'swipes 기록 저장(pass), 이후 카드 목록에서 제외',                          mgr:'미정', done:'완료' },
  { pid:'MATCH-003',fid:'MATCH-003-F01',l1:'1:1 매칭', l2:'매칭 목록',l3:'',       name:'매칭 목록 조회',     desc:'상호 좋아요 완료된 사용자 목록 반환',                                     mgr:'미정', done:'완료' },
  { pid:'GRP-001',  fid:'GRP-001-F01',  l1:'과팅 매칭', l2:'그룹방', l3:'목록',    name:'그룹방 목록 조회',   desc:'waiting 상태 그룹방 목록 반환 (성별 필터 지원)',                           mgr:'미정', done:'완료' },
  { pid:'GRP-002',  fid:'GRP-002-F01',  l1:'과팅 매칭', l2:'그룹방', l3:'생성',    name:'그룹방 생성',        desc:'제목, 설명, 최대 인원, 선호 성별 설정. 생성자 자동 방장 등록',              mgr:'미정', done:'완료' },
  { pid:'GRP-003',  fid:'GRP-003-F01',  l1:'과팅 매칭', l2:'그룹방', l3:'참여',    name:'그룹방 참여',        desc:'최대 인원 미달 시 참여 가능, 참여자 group_room_members 추가',               mgr:'미정', done:'완료' },
  { pid:'GRP-003',  fid:'GRP-003-F02',  l1:'과팅 매칭', l2:'그룹방', l3:'나가기',  name:'그룹방 나가기',      desc:'멤버 탈퇴. 방장이 나갈 경우 다음 멤버 방장 자동 승계',                     mgr:'미정', done:'완료' },
  { pid:'GRP-004',  fid:'GRP-004-F01',  l1:'과팅 매칭', l2:'그룹방', l3:'신청',    name:'과팅 신청',          desc:'상대 그룹에 신청, 양 그룹 matched 상태 전환 및 그룹 채팅방 자동 생성',      mgr:'미정', done:'완료' },
  { pid:'GRP-005',  fid:'GRP-005-F01',  l1:'과팅 매칭', l2:'그룹방', l3:'해체',    name:'그룹방 해체',        desc:'방장만 가능, waiting 상태에서만 해체 허용',                               mgr:'미정', done:'완료' },
  { pid:'GRP-005',  fid:'GRP-005-F02',  l1:'과팅 매칭', l2:'그룹방', l3:'매칭 취소',name:'매칭 취소',        desc:'방장만 가능, matched → waiting 복귀, 연결된 그룹 채팅방 삭제',              mgr:'미정', done:'완료' },
  { pid:'CHAT-001', fid:'CHAT-001-F01', l1:'채팅', l2:'채팅방',     l3:'목록',     name:'채팅방 목록 조회',   desc:'참여 채팅방 목록, 마지막 메시지 미리보기, 미읽음 수 포함 반환',             mgr:'미정', done:'완료' },
  { pid:'CHAT-002', fid:'CHAT-002-F01', l1:'채팅', l2:'메시지',     l3:'조회',     name:'메시지 조회',        desc:'채팅방 메시지 페이지네이션 조회',                                         mgr:'미정', done:'완료' },
  { pid:'CHAT-003', fid:'CHAT-003-F01', l1:'채팅', l2:'메시지',     l3:'전송',     name:'메시지 전송',        desc:'REST API로 DB 저장, Socket.IO로 실시간 브로드캐스트',                      mgr:'미정', done:'완료' },
  { pid:'CHAT-003', fid:'CHAT-003-F02', l1:'채팅', l2:'메시지',     l3:'읽음',     name:'읽음 처리',          desc:'채팅방 입장 시 해당 방 메시지 is_read = true 처리',                       mgr:'미정', done:'완료' },
  { pid:'CHAT-004', fid:'CHAT-004-F01', l1:'채팅', l2:'채팅방',     l3:'이름 변경',name:'채팅방 이름 변경',  desc:'그룹 채팅방 이름 변경 (방장만 허용)',                                     mgr:'미정', done:'완료' },
  { pid:'CHAT-004', fid:'CHAT-004-F02', l1:'채팅', l2:'채팅방',     l3:'나가기',   name:'채팅방 나가기',      desc:'chat_room_members에서 해당 사용자 제거',                                  mgr:'미정', done:'완료' },
  { pid:'CHAT-005', fid:'CHAT-005-F01', l1:'채팅', l2:'차단',       l3:'',         name:'사용자 차단',        desc:'user_blocks 저장, 해당 1:1 채팅방 자동 나가기 처리',                      mgr:'미정', done:'완료' },
  { pid:'APPT-001', fid:'APPT-001-F01', l1:'약속', l2:'제안',       l3:'',         name:'약속 제안',          desc:'날짜, 시간, 장소 입력하여 약속 제안 (pending 상태)',                      mgr:'미정', done:'완료' },
  { pid:'APPT-001', fid:'APPT-001-F02', l1:'약속', l2:'조회',       l3:'',         name:'약속 목록 조회',     desc:'채팅방 내 약속 전체 목록 반환',                                          mgr:'미정', done:'완료' },
  { pid:'APPT-002', fid:'APPT-002-F01', l1:'약속', l2:'상태 관리',  l3:'확정',     name:'약속 확정',          desc:'약속 상태 confirmed로 변경',                                             mgr:'미정', done:'완료' },
  { pid:'APPT-002', fid:'APPT-002-F02', l1:'약속', l2:'상태 관리',  l3:'취소',     name:'약속 취소',          desc:'약속 상태 cancelled로 변경',                                             mgr:'미정', done:'완료' },
  { pid:'SUPP-001', fid:'SUPP-001-F01', l1:'고객센터', l2:'문의',   l3:'제출',     name:'문의 제출',          desc:'카테고리, 제목, 내용 입력하여 문의 등록',                                 mgr:'미정', done:'완료' },
  { pid:'SUPP-002', fid:'SUPP-002-F01', l1:'고객센터', l2:'문의',   l3:'목록',     name:'문의 목록 조회',     desc:'내 문의 전체 목록 반환',                                                 mgr:'미정', done:'완료' },
  { pid:'SUPP-002', fid:'SUPP-002-F02', l1:'고객센터', l2:'문의',   l3:'상세',     name:'문의 상세 조회',     desc:'특정 문의 상세 내용 및 답변 반환',                                       mgr:'미정', done:'완료' },
];

const screens = [
  { id:'SCR-01', name:'로그인 화면',      path:'/login',          comp:'LoginPage.tsx',                                                         desc:'이메일·비밀번호 입력 폼. 로그인 버튼. 회원가입 페이지 링크. @yeonsung.ac.kr 도메인 검증.' },
  { id:'SCR-02', name:'회원가입 화면',    path:'/register',       comp:'RegisterPage.tsx',                                                      desc:'① 이메일 입력 → 인증 코드 발송 ② 코드 확인 ③ 닉네임·학번·학과·학년·성별·비밀번호 입력 후 가입.' },
  { id:'SCR-03', name:'홈 화면',          path:'/',               comp:'HomePage.tsx',                                                          desc:'사용자 인사말, 프로필 요약. 1:1 매칭 / 과팅 매칭 빠른 이동 버튼.' },
  { id:'SCR-04', name:'1:1 매칭 화면',    path:'/matching',       comp:'MatchingPage.tsx',                                                      desc:'상대 프로필 카드 (사진·닉네임·학과·학년·MBTI·관심사). 좋아요 / 패스 버튼.' },
  { id:'SCR-05', name:'과팅 매칭 화면',   path:'/group-matching', comp:'GroupMatchingPage.tsx',                                                 desc:'대기 중인 그룹방 목록. 방 만들기 버튼. 내 그룹방 정보. 과팅 신청 버튼.' },
  { id:'SCR-06', name:'채팅 목록 화면',   path:'/chat',           comp:'ChatListPage.tsx',                                                      desc:'참여 채팅방 목록. 마지막 메시지 미리보기. 미읽음 수 배지.' },
  { id:'SCR-07', name:'채팅방 화면',      path:'/chat/:roomId',   comp:'ChatRoomPage.tsx, AppointmentCard.tsx, AppointmentSheet.tsx, ChatRoomSettingsSheet.tsx', desc:'실시간 메시지 목록. 메시지 입력창. 약속 카드 (제안·확정·취소). 채팅방 설정 시트 (이름 변경·나가기·차단).' },
  { id:'SCR-08', name:'프로필 화면',      path:'/profile',        comp:'ProfilePage.tsx',                                                       desc:'내 프로필 전체 정보. 프로필 사진 업로드. 비밀번호 변경. 프로필 수정 링크.' },
  { id:'SCR-09', name:'프로필 수정 화면', path:'/profile/edit',   comp:'ProfileEditPage.tsx',                                                   desc:'닉네임, 자기소개, MBTI, 관심사 수정 폼.' },
  { id:'SCR-10', name:'고객센터 화면',    path:'/support',        comp:'SupportPage.tsx',                                                       desc:'카테고리 선택·제목·내용 입력 폼. 제출 버튼. 내 문의 내역 목록.' },
];

const tableSpecs = [
  { name:'users', desc:'사용자 기본 정보', cols:[
    { col:'id',            type:'UUID',          pk:true,  fk:'',                 nn:true,  def:'uuid_generate_v4()', desc:'사용자 고유 ID' },
    { col:'email',         type:'VARCHAR(100)',   pk:false, fk:'',                 nn:true,  def:'',        desc:'학교 이메일 (UNIQUE)' },
    { col:'password_hash', type:'TEXT',           pk:false, fk:'',                 nn:true,  def:'',        desc:'bcrypt 해싱 비밀번호' },
    { col:'nickname',      type:'VARCHAR(20)',    pk:false, fk:'',                 nn:true,  def:'',        desc:'닉네임 (UNIQUE)' },
    { col:'student_id',    type:'VARCHAR(20)',    pk:false, fk:'',                 nn:true,  def:'',        desc:'학번' },
    { col:'department',    type:'VARCHAR(50)',    pk:false, fk:'',                 nn:true,  def:'',        desc:'학과' },
    { col:'grade',         type:'SMALLINT',       pk:false, fk:'',                 nn:true,  def:'',        desc:'학년 (1~4)' },
    { col:'gender',        type:'VARCHAR(10)',    pk:false, fk:'',                 nn:true,  def:'',        desc:'성별 (male/female)' },
    { col:'profile_image', type:'TEXT',           pk:false, fk:'',                 nn:false, def:'',        desc:'프로필 이미지 경로' },
    { col:'bio',           type:'VARCHAR(200)',   pk:false, fk:'',                 nn:false, def:'',        desc:'자기소개' },
    { col:'mbti',          type:'VARCHAR(4)',     pk:false, fk:'',                 nn:false, def:'',        desc:'MBTI 유형' },
    { col:'interests',     type:'TEXT[]',         pk:false, fk:'',                 nn:false, def:'{}',      desc:'관심사 배열' },
    { col:'is_verified',   type:'BOOLEAN',        pk:false, fk:'',                 nn:false, def:'FALSE',   desc:'이메일 인증 여부' },
    { col:'created_at',    type:'TIMESTAMPTZ',    pk:false, fk:'',                 nn:false, def:'NOW()',   desc:'생성 일시' },
    { col:'updated_at',    type:'TIMESTAMPTZ',    pk:false, fk:'',                 nn:false, def:'NOW()',   desc:'수정 일시' },
  ]},
  { name:'refresh_tokens', desc:'JWT Refresh Token 저장', cols:[
    { col:'id',         type:'UUID',        pk:true,  fk:'',           nn:true,  def:'uuid_generate_v4()', desc:'토큰 고유 ID' },
    { col:'user_id',    type:'UUID',        pk:false, fk:'users(id)',   nn:true,  def:'',      desc:'사용자 ID (FK)' },
    { col:'token',      type:'TEXT',        pk:false, fk:'',           nn:true,  def:'',      desc:'Refresh Token 값 (UNIQUE)' },
    { col:'expires_at', type:'TIMESTAMPTZ', pk:false, fk:'',           nn:true,  def:'',      desc:'만료 일시' },
    { col:'created_at', type:'TIMESTAMPTZ', pk:false, fk:'',           nn:false, def:'NOW()', desc:'생성 일시' },
  ]},
  { name:'swipes', desc:'스와이프 행동 기록', cols:[
    { col:'id',         type:'UUID',        pk:true,  fk:'',           nn:true,  def:'uuid_generate_v4()', desc:'스와이프 고유 ID' },
    { col:'swiper_id',  type:'UUID',        pk:false, fk:'users(id)',   nn:true,  def:'',      desc:'스와이프한 사용자 (FK)' },
    { col:'target_id',  type:'UUID',        pk:false, fk:'users(id)',   nn:true,  def:'',      desc:'스와이프 대상 사용자 (FK)' },
    { col:'action',     type:'VARCHAR(10)', pk:false, fk:'',           nn:true,  def:'',      desc:'행동 (like/pass)' },
    { col:'created_at', type:'TIMESTAMPTZ', pk:false, fk:'',           nn:false, def:'NOW()', desc:'생성 일시' },
  ]},
  { name:'matches', desc:'1:1 매칭 결과', cols:[
    { col:'id',         type:'UUID',        pk:true,  fk:'',           nn:true,  def:'uuid_generate_v4()', desc:'매칭 고유 ID' },
    { col:'user1_id',   type:'UUID',        pk:false, fk:'users(id)',   nn:true,  def:'',         desc:'사용자 1 (FK)' },
    { col:'user2_id',   type:'UUID',        pk:false, fk:'users(id)',   nn:true,  def:'',         desc:'사용자 2 (FK)' },
    { col:'status',     type:'VARCHAR(20)', pk:false, fk:'',           nn:false, def:'matched',  desc:'매칭 상태 (pending/matched)' },
    { col:'created_at', type:'TIMESTAMPTZ', pk:false, fk:'',           nn:false, def:'NOW()',    desc:'생성 일시' },
  ]},
  { name:'group_rooms', desc:'과팅 그룹방 정보', cols:[
    { col:'id',               type:'UUID',        pk:true,  fk:'',           nn:true,  def:'uuid_generate_v4()', desc:'그룹방 고유 ID' },
    { col:'title',            type:'VARCHAR(100)', pk:false, fk:'',          nn:true,  def:'',        desc:'방 제목' },
    { col:'description',      type:'TEXT',         pk:false, fk:'',          nn:false, def:'',        desc:'방 설명' },
    { col:'leader_id',        type:'UUID',         pk:false, fk:'users(id)', nn:true,  def:'',        desc:'방장 (FK)' },
    { col:'gender',           type:'VARCHAR(10)',  pk:false, fk:'',          nn:true,  def:'',        desc:'방 성별 (male/female)' },
    { col:'max_members',      type:'SMALLINT',     pk:false, fk:'',          nn:false, def:'3',       desc:'최대 인원 (2~10)' },
    { col:'preferred_gender', type:'VARCHAR(10)',  pk:false, fk:'',          nn:true,  def:'',        desc:'선호 상대 성별' },
    { col:'status',           type:'VARCHAR(20)',  pk:false, fk:'',          nn:false, def:'waiting', desc:'상태 (waiting/matched/closed)' },
    { col:'created_at',       type:'TIMESTAMPTZ',  pk:false, fk:'',          nn:false, def:'NOW()',   desc:'생성 일시' },
  ]},
  { name:'group_room_members', desc:'그룹방 멤버 (복합 PK)', cols:[
    { col:'group_room_id', type:'UUID',        pk:true,  fk:'group_rooms(id)', nn:true,  def:'',        desc:'그룹방 ID (PK, FK)' },
    { col:'user_id',       type:'UUID',        pk:true,  fk:'users(id)',       nn:true,  def:'',        desc:'사용자 ID (PK, FK)' },
    { col:'is_leader',     type:'BOOLEAN',     pk:false, fk:'',               nn:false, def:'FALSE',   desc:'방장 여부' },
    { col:'joined_at',     type:'TIMESTAMPTZ', pk:false, fk:'',               nn:false, def:'NOW()',   desc:'참여 일시' },
  ]},
  { name:'chat_rooms', desc:'채팅방 정보', cols:[
    { col:'id',            type:'UUID',        pk:true,  fk:'',               nn:true,  def:'uuid_generate_v4()', desc:'채팅방 고유 ID' },
    { col:'type',          type:'VARCHAR(20)', pk:false, fk:'',               nn:true,  def:'',        desc:'유형 (individual/group)' },
    { col:'group_room_id', type:'UUID',        pk:false, fk:'group_rooms(id)',nn:false, def:'',        desc:'연결된 그룹방 (FK, NULL 가능)' },
    { col:'created_at',    type:'TIMESTAMPTZ', pk:false, fk:'',               nn:false, def:'NOW()',   desc:'생성 일시' },
  ]},
  { name:'chat_room_members', desc:'채팅방 멤버 (복합 PK)', cols:[
    { col:'chat_room_id', type:'UUID',        pk:true,  fk:'chat_rooms(id)', nn:true,  def:'',      desc:'채팅방 ID (PK, FK)' },
    { col:'user_id',      type:'UUID',        pk:true,  fk:'users(id)',      nn:true,  def:'',      desc:'사용자 ID (PK, FK)' },
    { col:'joined_at',    type:'TIMESTAMPTZ', pk:false, fk:'',              nn:false, def:'NOW()', desc:'참여 일시' },
  ]},
  { name:'messages', desc:'채팅 메시지', cols:[
    { col:'id',         type:'UUID',        pk:true,  fk:'',               nn:true,  def:'uuid_generate_v4()', desc:'메시지 고유 ID' },
    { col:'room_id',    type:'UUID',        pk:false, fk:'chat_rooms(id)', nn:true,  def:'',      desc:'채팅방 ID (FK)' },
    { col:'sender_id',  type:'UUID',        pk:false, fk:'users(id)',      nn:true,  def:'',      desc:'발신자 ID (FK)' },
    { col:'content',    type:'TEXT',        pk:false, fk:'',              nn:true,  def:'',      desc:'메시지 내용' },
    { col:'is_read',    type:'BOOLEAN',     pk:false, fk:'',              nn:false, def:'FALSE', desc:'읽음 여부' },
    { col:'created_at', type:'TIMESTAMPTZ', pk:false, fk:'',              nn:false, def:'NOW()', desc:'생성 일시' },
  ]},
  { name:'user_blocks', desc:'사용자 차단 (복합 PK)', cols:[
    { col:'blocker_id', type:'UUID',        pk:true,  fk:'users(id)', nn:true,  def:'',      desc:'차단한 사용자 (PK, FK)' },
    { col:'blocked_id', type:'UUID',        pk:true,  fk:'users(id)', nn:true,  def:'',      desc:'차단된 사용자 (PK, FK)' },
    { col:'created_at', type:'TIMESTAMPTZ', pk:false, fk:'',          nn:false, def:'NOW()', desc:'차단 일시' },
  ]},
  { name:'support_inquiries', desc:'고객센터 문의', cols:[
    { col:'id',          type:'UUID',         pk:true,  fk:'',           nn:true,  def:'uuid_generate_v4()', desc:'문의 고유 ID' },
    { col:'user_id',     type:'UUID',         pk:false, fk:'users(id)',  nn:true,  def:'',         desc:'사용자 ID (FK)' },
    { col:'category',    type:'VARCHAR(30)',   pk:false, fk:'',          nn:true,  def:'',         desc:'문의 카테고리' },
    { col:'title',       type:'VARCHAR(100)',  pk:false, fk:'',          nn:true,  def:'',         desc:'문의 제목' },
    { col:'content',     type:'TEXT',          pk:false, fk:'',          nn:true,  def:'',         desc:'문의 내용' },
    { col:'status',      type:'VARCHAR(20)',   pk:false, fk:'',          nn:false, def:'pending',  desc:'상태 (pending/answered)' },
    { col:'answer',      type:'TEXT',          pk:false, fk:'',          nn:false, def:'',         desc:'답변 내용' },
    { col:'answered_at', type:'TIMESTAMPTZ',   pk:false, fk:'',          nn:false, def:'',         desc:'답변 일시' },
    { col:'created_at',  type:'TIMESTAMPTZ',   pk:false, fk:'',          nn:false, def:'NOW()',    desc:'생성 일시' },
  ]},
  { name:'appointments', desc:'약속 정보', cols:[
    { col:'id',          type:'UUID',         pk:true,  fk:'',               nn:true,  def:'uuid_generate_v4()', desc:'약속 고유 ID' },
    { col:'room_id',     type:'UUID',         pk:false, fk:'chat_rooms(id)', nn:true,  def:'',         desc:'채팅방 ID (FK)' },
    { col:'proposer_id', type:'UUID',         pk:false, fk:'users(id)',      nn:true,  def:'',         desc:'제안자 ID (FK)' },
    { col:'date',        type:'DATE',          pk:false, fk:'',              nn:true,  def:'',         desc:'약속 날짜' },
    { col:'time',        type:'TIME',          pk:false, fk:'',              nn:true,  def:'',         desc:'약속 시간' },
    { col:'location',    type:'VARCHAR(100)',  pk:false, fk:'',              nn:true,  def:'',         desc:'약속 장소' },
    { col:'status',      type:'VARCHAR(20)',   pk:false, fk:'',              nn:false, def:'pending',  desc:'상태 (pending/confirmed/cancelled)' },
    { col:'created_at',  type:'TIMESTAMPTZ',  pk:false, fk:'',              nn:false, def:'NOW()',    desc:'생성 일시' },
    { col:'updated_at',  type:'TIMESTAMPTZ',  pk:false, fk:'',              nn:false, def:'NOW()',    desc:'수정 일시' },
  ]},
];

const testCases = [
  { pid:'AUTH-001', scenario:'학교 이메일로 인증 코드 요청',      expected:'6자리 인증 코드 이메일 발송',                 result:'PASS', fix:'' },
  { pid:'AUTH-001', scenario:'올바른 인증 코드 입력',             expected:'인증 완료 응답',                             result:'PASS', fix:'' },
  { pid:'AUTH-001', scenario:'만료된 코드 입력',                  expected:'만료 오류 응답',                             result:'PASS', fix:'' },
  { pid:'AUTH-002', scenario:'정상 정보로 회원가입',              expected:'계정 생성 및 JWT 토큰 반환',                  result:'PASS', fix:'' },
  { pid:'AUTH-002', scenario:'중복 이메일로 회원가입',            expected:'중복 오류 응답 (409)',                        result:'PASS', fix:'' },
  { pid:'AUTH-003', scenario:'올바른 이메일/비밀번호로 로그인',   expected:'Access·Refresh Token 반환',                  result:'PASS', fix:'' },
  { pid:'AUTH-003', scenario:'잘못된 비밀번호로 로그인',          expected:'인증 오류 응답 (401)',                        result:'PASS', fix:'' },
  { pid:'AUTH-004', scenario:'Refresh Token으로 Access Token 갱신',expected:'새 Access Token 반환',                     result:'PASS', fix:'' },
  { pid:'AUTH-004', scenario:'로그아웃',                          expected:'Refresh Token 삭제·쿠키 초기화',             result:'PASS', fix:'' },
  { pid:'USR-001',  scenario:'내 프로필 조회',                    expected:'사용자 전체 정보 반환',                       result:'PASS', fix:'' },
  { pid:'USR-002',  scenario:'닉네임·MBTI·관심사 수정',          expected:'수정된 프로필 반환',                          result:'PASS', fix:'' },
  { pid:'USR-003',  scenario:'프로필 이미지 파일 업로드',         expected:'이미지 URL 반환·프로필 반영',                 result:'PASS', fix:'' },
  { pid:'USR-004',  scenario:'현재 비밀번호 확인 후 변경',        expected:'비밀번호 변경 성공',                          result:'PASS', fix:'' },
  { pid:'MATCH-001',scenario:'매칭 카드 목록 조회',               expected:'미스와이프 이성 프로필 목록 반환',            result:'PASS', fix:'' },
  { pid:'MATCH-002',scenario:'상대에게 좋아요',                   expected:'swipes 저장',                                result:'PASS', fix:'' },
  { pid:'MATCH-002',scenario:'상호 좋아요 발생',                  expected:'matches 생성 및 1:1 채팅방 자동 개설',       result:'PASS', fix:'' },
  { pid:'MATCH-002',scenario:'패스 처리',                         expected:'swipes(pass) 저장·이후 카드 목록 제외',      result:'PASS', fix:'' },
  { pid:'MATCH-003',scenario:'매칭된 사용자 목록 조회',           expected:'매칭 목록 반환',                             result:'PASS', fix:'' },
  { pid:'GRP-001',  scenario:'대기 중 그룹방 목록 조회',          expected:'waiting 상태 그룹방 목록 반환',              result:'PASS', fix:'' },
  { pid:'GRP-002',  scenario:'그룹방 생성',                       expected:'그룹방 생성·방장 자동 등록',                 result:'PASS', fix:'' },
  { pid:'GRP-003',  scenario:'그룹방 참여',                       expected:'멤버 추가 성공',                             result:'PASS', fix:'' },
  { pid:'GRP-003',  scenario:'최대 인원 초과 참여 시도',          expected:'참여 불가 오류 응답',                        result:'PASS', fix:'' },
  { pid:'GRP-004',  scenario:'상대 그룹에 과팅 신청',             expected:'양 그룹 matched·그룹 채팅방 생성',           result:'PASS', fix:'' },
  { pid:'GRP-005',  scenario:'방장이 그룹방 해체',                expected:'그룹방 삭제',                                result:'PASS', fix:'' },
  { pid:'GRP-005',  scenario:'방장이 매칭 취소',                  expected:'waiting 복귀·그룹 채팅방 삭제',              result:'PASS', fix:'' },
  { pid:'CHAT-001', scenario:'채팅방 목록 조회',                  expected:'목록·마지막 메시지·미읽음 수 반환',           result:'PASS', fix:'' },
  { pid:'CHAT-002', scenario:'메시지 페이지네이션 조회',          expected:'메시지 목록 반환',                           result:'PASS', fix:'' },
  { pid:'CHAT-003', scenario:'메시지 전송',                       expected:'DB 저장·Socket.IO 실시간 브로드캐스트',      result:'PASS', fix:'' },
  { pid:'CHAT-003', scenario:'채팅방 입장 시 읽음 처리',          expected:'is_read = true 업데이트',                    result:'PASS', fix:'' },
  { pid:'CHAT-004', scenario:'그룹 채팅방 이름 변경 (방장)',      expected:'채팅방 이름 수정 성공',                      result:'PASS', fix:'' },
  { pid:'CHAT-004', scenario:'채팅방 나가기',                     expected:'chat_room_members에서 제거',                 result:'PASS', fix:'' },
  { pid:'CHAT-005', scenario:'사용자 차단',                       expected:'user_blocks 저장·1:1 채팅방 자동 나가기',   result:'PASS', fix:'' },
  { pid:'APPT-001', scenario:'약속 제안',                         expected:'약속 저장 (pending 상태)',                   result:'PASS', fix:'' },
  { pid:'APPT-001', scenario:'채팅방 약속 목록 조회',             expected:'약속 목록 반환',                             result:'PASS', fix:'' },
  { pid:'APPT-002', scenario:'약속 확정',                         expected:'상태 confirmed 변경',                       result:'PASS', fix:'' },
  { pid:'APPT-002', scenario:'약속 취소',                         expected:'상태 cancelled 변경',                       result:'PASS', fix:'' },
  { pid:'SUPP-001', scenario:'문의 제출',                         expected:'문의 저장 성공',                             result:'PASS', fix:'' },
  { pid:'SUPP-002', scenario:'내 문의 목록 조회',                 expected:'문의 목록 반환',                             result:'PASS', fix:'' },
  { pid:'SUPP-002', scenario:'특정 문의 상세 조회',               expected:'문의 상세·답변 반환',                        result:'PASS', fix:'' },
];

// WBS - week labels (W01~W15) and task plan
const weekLabels = ['3/2','3/9','3/16','3/23','3/30','4/6','4/13','4/20','4/27','5/4','5/11','5/18','5/25','6/1','6/8'];
const wbsTasks = [
  { name:'요구사항 분석',         plan:[1,2],     done:[1,2] },
  { name:'DB 설계',               plan:[2,3],     done:[2,3] },
  { name:'개발환경 구축',         plan:[3],       done:[3] },
  { name:'인증 기능 (AUTH)',       plan:[3,4],     done:[3,4] },
  { name:'사용자 프로필 (USR)',    plan:[4,5],     done:[4,5] },
  { name:'1:1 매칭 (MATCH)',       plan:[5,6],     done:[5,6] },
  { name:'과팅 매칭 (GRP)',        plan:[6,7],     done:[6,7] },
  { name:'채팅 기능 (CHAT)',       plan:[7,8],     done:[7,8] },
  { name:'약속 기능 (APPT)',       plan:[8,9],     done:[8] },
  { name:'고객센터 (SUPP)',        plan:[8],       done:[8] },
  { name:'버그 수정 및 안정화',   plan:[9,10],    done:[] },
  { name:'UI/UX 개선',             plan:[10,11],   done:[] },
  { name:'통합 테스트',            plan:[11,12],   done:[] },
  { name:'성능 최적화',            plan:[12,13],   done:[] },
  { name:'최종 보고서 작성',       plan:[14,15],   done:[] },
  { name:'최종 발표',              plan:[15],      done:[] },
];

// ─── 섹션 생성 함수 ──────────────────────────────────────────────────────────

function makeCover() {
  return [
    new Paragraph({ text: '', spacing: { before: 2400 } }),
    new Paragraph({
      children: [txt('썸전 (SSUMJEON)', { bold: true, size: 72, color: C.HEADER_BG })],
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      children: [txt('연성대학교 과팅 매칭 플랫폼', { size: 32 })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 200 },
    }),
    new Paragraph({
      children: [txt('중  간  보  고  서', { bold: true, size: 56 })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 800, after: 800 },
    }),
    new Paragraph({
      children: [txt('제출일 : 2026년 04월 22일', { size: 26 })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 600 },
    }),
    pageBreak(),
  ];
}

function makeDevEnv() {
  const rows_data = [
    ['프론트엔드', 'Framework',    'React 18.3.1'],
    ['',          'Build Tool',   'Vite 5.3.4'],
    ['',          'Language',     'TypeScript 5.2.2'],
    ['',          'Routing',      'React Router DOM 6.24.1'],
    ['',          'State',        'Zustand 4.5.4'],
    ['',          'Form',         'React Hook Form 7.52.1'],
    ['',          'CSS',          'Tailwind CSS 3.4.6'],
    ['',          'Real-time',    'Socket.IO Client 4.7.5'],
    ['',          '날짜',          'Day.js 1.11.11'],
    ['',          '개발 서버 포트','5173 (HTTPS)'],
    ['백엔드',    'Runtime',      'Node.js v25.8.1'],
    ['',          'Framework',    'Express 4.19.2'],
    ['',          'Language',     'TypeScript 5.5.4'],
    ['',          '인증',          'JWT (jsonwebtoken 9.0.2)'],
    ['',          '암호화',        'bcryptjs 2.4.3'],
    ['',          '실시간 통신',   'Socket.IO 4.7.5'],
    ['',          '파일 업로드',   'Multer 2.1.1'],
    ['',          '이메일',        'Nodemailer 6.9.14'],
    ['',          '서버 포트',     '4000 (HTTP)'],
    ['데이터베이스','DBMS',        'PostgreSQL 18.3'],
    ['',          '포트',          '5432'],
    ['',          'DB명',          'ssumjeon'],
    ['',          'ORM/드라이버', 'pg (node-postgres) 8.12.0'],
    ['개발 도구', 'IDE',           'Visual Studio Code'],
    ['',          '버전 관리',     'Git'],
    ['',          '패키지 관리',   'npm 11.11.0'],
    ['',          'OS',            'Windows 10 Pro'],
  ];

  const rows = [
    headerRow([{ text:'구분', width:1600 }, { text:'항목', width:2200 }, { text:'버전 / 내용', width:5000 }]),
    ...rows_data.map((r, i) => new TableRow({ children: [
      cell(r[0], { shade: r[0] ? C.LABEL_BG : undefined, bold: !!r[0], align: AlignmentType.CENTER, width: 1600 }),
      cell(r[1], { shade: i % 2 === 1 ? C.ALT_ROW : undefined, width: 2200 }),
      cell(r[2], { shade: i % 2 === 1 ? C.ALT_ROW : undefined, width: 5000 }),
    ]})),
  ];

  return [
    h1('1. 개발환경 정의서'),
    new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } }),
    pageBreak(),
  ];
}

function makeProgramList() {
  const hdr = [
    { text:'프로그램 ID', width:1400 },
    { text:'Level 1',     width:1100 },
    { text:'Level 2',     width:1300 },
    { text:'Level 3',     width:1100 },
    { text:'프로그램명',   width:2500 },
    { text:'사용 테이블', width:2200 },
    { text:'담당자',      width:700 },
  ];
  const rows = [
    headerRow(hdr),
    ...programs.map((p, i) => dataRow([
      { text:p.id,    align:AlignmentType.CENTER, width:1400 },
      { text:p.l1,                                width:1100 },
      { text:p.l2,                                width:1300 },
      { text:p.l3,                                width:1100 },
      { text:p.name,                              width:2500 },
      { text:p.tables,                            width:2200 },
      { text:p.mgr,   align:AlignmentType.CENTER, width:700 },
    ], i % 2 === 1)),
  ];
  return [
    h1('2. 프로그램 목록'),
    new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } }),
    pageBreak(),
  ];
}

function makeScreenDesign() {
  const children = [h1('3. 화면설계서')];
  for (const s of screens) {
    children.push(
      h2(`${s.id}. ${s.name}`),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({ children: [
            cell('화면 ID',  { shade:C.LABEL_BG, bold:true, width:1800 }),
            cell(s.id,       { width:2800 }),
            cell('URL',      { shade:C.LABEL_BG, bold:true, width:1800 }),
            cell(s.path,     { width:3400 }),
          ]}),
          new TableRow({ children: [
            cell('화면명',   { shade:C.LABEL_BG, bold:true, width:1800 }),
            cell(s.name,     { span:3 }),
          ]}),
          new TableRow({ children: [
            cell('컴포넌트', { shade:C.LABEL_BG, bold:true, width:1800 }),
            cell(s.comp,     { span:3 }),
          ]}),
          new TableRow({ children: [
            cell('화면 설명',{ shade:C.LABEL_BG, bold:true, width:1800 }),
            cell(s.desc,     { span:3 }),
          ]}),
        ],
      }),
      new Paragraph({ text:'', spacing:{ after:200 } }),
    );
  }
  children.push(pageBreak());
  return children;
}

function makeFeatureSpec() {
  const hdr = [
    { text:'프로그램 ID', width:1300 },
    { text:'기능 ID',     width:1700 },
    { text:'Level 1',     width:1000 },
    { text:'Level 2',     width:1300 },
    { text:'Level 3',     width:1000 },
    { text:'기능명',      width:1500 },
    { text:'기능 설명',   width:3000 },
    { text:'담당자',      width:700 },
    { text:'완료',        width:700 },
  ];
  const rows = [
    headerRow(hdr),
    ...features.map((f, i) => dataRow([
      { text:f.pid,  align:AlignmentType.CENTER, width:1300 },
      { text:f.fid,  align:AlignmentType.CENTER, width:1700 },
      { text:f.l1,                               width:1000 },
      { text:f.l2,                               width:1300 },
      { text:f.l3,                               width:1000 },
      { text:f.name,                             width:1500 },
      { text:f.desc,                             width:3000 },
      { text:f.mgr,  align:AlignmentType.CENTER, width:700 },
      { text:f.done, align:AlignmentType.CENTER, shade:f.done==='완료'?C.PASS_BG:C.ALT_ROW, width:700 },
    ], i % 2 === 1)),
  ];
  return [
    h1('4. 기능명세서'),
    new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } }),
    pageBreak(),
  ];
}

function makeWBS() {
  const N = 15;
  const TASK_W = 2400;
  const WEEK_W = 460;

  const hdrCells = [
    cell('작업 항목', { shade:C.HEADER_BG, bold:true, align:AlignmentType.CENTER, width:TASK_W, size:18 }),
    ...weekLabels.map((lbl, i) =>
      cell(`W${String(i+1).padStart(2,'0')}\n${lbl}`, {
        shade: i < 8 ? C.HEADER_BG : '4F81BD',
        bold:true, align:AlignmentType.CENTER, width:WEEK_W, size:14,
      })
    ),
  ];

  const taskRows = wbsTasks.map(t => new TableRow({ children: [
    cell(t.name, { width:TASK_W }),
    ...Array.from({ length:N }, (_, i) => {
      const w = i + 1;
      const fill = t.done.includes(w) ? C.GANTT_DONE
                 : t.plan.includes(w) ? C.GANTT_PLAN
                 : undefined;
      return cell('', { shade:fill, width:WEEK_W });
    }),
  ]}));

  return [
    h1('5. WBS (간트차트)'),
    new Paragraph({
      children: [
        txt('■ ', { bold:true, color:C.GANTT_DONE }),
        txt('완료    ', {}),
        txt('■ ', { bold:true, color:C.GANTT_PLAN }),
        txt('계획    ', {}),
        txt('기준일: 2026. 04. 22  |  기간: 2026-03-02 ~ 2026-06-14', { italics:true }),
      ],
      spacing:{ before:100, after:200 },
    }),
    new Table({
      rows: [new TableRow({ children:hdrCells }), ...taskRows],
      width: { size:100, type:WidthType.PERCENTAGE },
    }),
    pageBreak(),
  ];
}

function makeTableSpec() {
  const children = [h1('6. 테이블 명세서')];
  const colHdr = [
    { text:'컬럼명',       width:1800 },
    { text:'데이터 타입',  width:1600 },
    { text:'PK',           width:500 },
    { text:'FK 참조',      width:1800 },
    { text:'NOT NULL',     width:800 },
    { text:'DEFAULT',      width:1200 },
    { text:'설명',         width:2100 },
  ];
  for (const tbl of tableSpecs) {
    children.push(
      h2(`${tbl.name}  —  ${tbl.desc}`),
      new Table({
        width: { size:100, type:WidthType.PERCENTAGE },
        rows: [
          headerRow(colHdr),
          ...tbl.cols.map((c, i) => dataRow([
            { text:c.col,  bold:c.pk, width:1800 },
            { text:c.type,            width:1600 },
            { text:c.pk?'●':'',  align:AlignmentType.CENTER, width:500 },
            { text:c.fk,              width:1800 },
            { text:c.nn?'●':'',  align:AlignmentType.CENTER, width:800 },
            { text:c.def,             width:1200 },
            { text:c.desc,            width:2100 },
          ], i % 2 === 1)),
        ],
      }),
      new Paragraph({ text:'', spacing:{ after:200 } }),
    );
  }
  children.push(pageBreak());
  return children;
}

function makeERD() {
  const erdLines = [
    'users ─────┬──(1:N)── refresh_tokens         (user_id)',
    '           ├──(1:N)── swipes                 (swiper_id, target_id)',
    '           ├──(1:N)── matches                (user1_id, user2_id)',
    '           ├──(1:N)── group_rooms            (leader_id)',
    '           ├──(1:N)── group_room_members     (user_id)',
    '           ├──(1:N)── chat_room_members      (user_id)',
    '           ├──(1:N)── messages               (sender_id)',
    '           ├──(1:N)── user_blocks            (blocker_id, blocked_id)',
    '           ├──(1:N)── support_inquiries      (user_id)',
    '           └──(1:N)── appointments           (proposer_id)',
    '',
    'group_rooms ─┬──(1:N)── group_room_members   (group_room_id)',
    '             └──(1:N)── chat_rooms            (group_room_id, ON DELETE SET NULL)',
    '',
    'chat_rooms ──┬──(1:N)── chat_room_members    (chat_room_id)',
    '             ├──(1:N)── messages              (room_id)',
    '             └──(1:N)── appointments          (room_id)',
    '',
    '복합 PK 테이블',
    '  · group_room_members : (group_room_id, user_id)',
    '  · chat_room_members  : (chat_room_id,  user_id)',
    '  · user_blocks        : (blocker_id,    blocked_id)',
  ];

  const relHdr = [
    { text:'부모 테이블',  width:2000 },
    { text:'자식 테이블',  width:2500 },
    { text:'FK 컬럼',      width:2000 },
    { text:'관계',         width:900 },
    { text:'ON DELETE',    width:1900 },
  ];
  const rels = [
    ['users','refresh_tokens',       'user_id',       '1:N','CASCADE'],
    ['users','swipes',               'swiper_id',     '1:N','CASCADE'],
    ['users','swipes',               'target_id',     '1:N','CASCADE'],
    ['users','matches',              'user1_id',      '1:N','CASCADE'],
    ['users','matches',              'user2_id',      '1:N','CASCADE'],
    ['users','group_rooms',          'leader_id',     '1:N','CASCADE'],
    ['users','group_room_members',   'user_id',       '1:N','CASCADE'],
    ['users','chat_room_members',    'user_id',       '1:N','CASCADE'],
    ['users','messages',             'sender_id',     '1:N','CASCADE'],
    ['users','user_blocks',          'blocker_id',    '1:N','CASCADE'],
    ['users','user_blocks',          'blocked_id',    '1:N','CASCADE'],
    ['users','support_inquiries',    'user_id',       '1:N','CASCADE'],
    ['users','appointments',         'proposer_id',   '1:N','CASCADE'],
    ['group_rooms','group_room_members','group_room_id','1:N','CASCADE'],
    ['group_rooms','chat_rooms',     'group_room_id', '1:N','SET NULL'],
    ['chat_rooms','chat_room_members','chat_room_id', '1:N','CASCADE'],
    ['chat_rooms','messages',        'room_id',       '1:N','CASCADE'],
    ['chat_rooms','appointments',    'room_id',       '1:N','CASCADE'],
  ];

  return [
    h1('7. 테이블 ERD'),
    h2('테이블 관계도'),
    ...erdLines.map(line =>
      new Paragraph({
        children: [new TextRun({ text: line || ' ', font:'Courier New', size:18 })],
        spacing:{ before:0, after:0 },
      })
    ),
    new Paragraph({ text:'', spacing:{ after:200 } }),
    h2('관계 목록'),
    new Table({
      rows: [
        headerRow(relHdr),
        ...rels.map((r, i) => dataRow(r.map(text => ({ text })), i % 2 === 1)),
      ],
      width:{ size:100, type:WidthType.PERCENTAGE },
    }),
    pageBreak(),
  ];
}

function makeTestResults() {
  const hdr = [
    { text:'프로그램 ID',  width:1300 },
    { text:'테스트 시나리오', width:3000 },
    { text:'기대 결과',    width:3000 },
    { text:'결과',         width:800 },
    { text:'수정 예정일',  width:1200 },
  ];
  const rows = [
    headerRow(hdr),
    ...testCases.map((t, i) => dataRow([
      { text:t.pid,      align:AlignmentType.CENTER, width:1300 },
      { text:t.scenario,                             width:3000 },
      { text:t.expected,                             width:3000 },
      { text:t.result,   align:AlignmentType.CENTER, shade:t.result==='PASS'?C.PASS_BG:C.FAIL_BG, width:800 },
      { text:t.fix||'-', align:AlignmentType.CENTER, width:1200 },
    ], i % 2 === 1)),
  ];
  return [
    h1('8. 테스트 결과서'),
    new Paragraph({
      children: [txt('테스트 기준일: 2026. 04. 22', { italics:true })],
      spacing:{ before:100, after:200 },
    }),
    new Table({ rows, width:{ size:100, type:WidthType.PERCENTAGE } }),
  ];
}

// ─── 문서 생성 ────────────────────────────────────────────────────────────────

const doc = new Document({
  styles: {
    default: {
      document: { run: { font:'맑은 고딕', size:22 } },
    },
  },
  sections: [{
    properties: {
      page: {
        margin: { top:1080, bottom:1080, left:1260, right:1260 },
      },
    },
    children: [
      ...makeCover(),
      ...makeDevEnv(),
      ...makeProgramList(),
      ...makeScreenDesign(),
      ...makeFeatureSpec(),
      ...makeWBS(),
      ...makeTableSpec(),
      ...makeERD(),
      ...makeTestResults(),
    ],
  }],
});

const buf = await Packer.toBuffer(doc);
writeFileSync('./썸전_중간보고서.docx', buf);
console.log('✅ 썸전_중간보고서.docx 생성 완료');
