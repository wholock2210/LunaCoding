/**
 * LunaCoding Language Module
 * Quản lý đa ngôn ngữ: tiếng Việt (vi) và tiếng Anh (en).
 * Tất cả chuỗi UI trong dự án được tập trung tại đây.
 */

export type Language = 'vi' | 'en';

// ============================================================
// Interface tổng hợp tất cả key dịch
// ============================================================
export interface Translations {
  // --- TerminalBottom ---
  'bottom.cmd.notFound': string;
  'bottom.cmd.helpHint': string;
  'bottom.cmd.press': string;
  'bottom.cmd.toReturn': string;
  'bottom.cmd.move': string;
  'bottom.cmd.select': string;
  'bottom.stable.label': string;
  'bottom.stable.frozen': string;
  'bottom.stable.toOff': string;
  'bottom.placeholder.loading': string;
  'bottom.placeholder.default': string;

  // --- TerminalMid ---
  'mid.empty': string;
  'mid.thinking': string;
  'mid.phase.analyzing': string;
  'mid.phase.planning': string;
  'mid.phase.executing': string;
  'mid.phase.responding': string;
  'mid.thinkingHint': string;
  'mid.error.invalidMode': string;

  // --- AgentModeBar ---
  'mode.normal': string;
  'mode.normal.desc': string;
  'mode.plan': string;
  'mode.plan.desc': string;
  'mode.acceptEdits': string;
  'mode.acceptEdits.desc': string;
  'mode.auto': string;
  'mode.auto.desc': string;
  'mode.fix': string;
  'mode.fix.desc': string;
  'mode.godMode': string;
  'mode.godMode.desc': string;
  'mode.hint': string;

  // --- ModelMenu ---
  'model.title': string;
  'model.defaultLabel': string;
  'model.fetching': string;
  'model.empty': string;
  'model.press': string;
  'model.toFetch': string;
  'model.toAdd': string;
  'model.toQuit': string;
  'model.page': string;
  'model.models': string;
  'model.moreAbove': string;
  'model.defaultTag': string;
  'model.back': string;
  'model.toDelete': string;
  'model.toSetDefault': string;
  'model.deleteConfirm.title': string;
  'model.deleteConfirm.message': string;
  'model.deleteConfirm.from': string;
  'model.deleteConfirm.press': string;
  'model.deleteConfirm.toConfirm': string;
  'model.deleteConfirm.toCancel': string;
  'model.deleted': string;
  'model.setDefault': string;
  'model.moreBelow': string;
  'model.help.select': string;
  'model.help.actions': string;

  // --- ProviderMenu ---
  'provider.title': string;
  'provider.noProvider': string;
  'provider.press': string;
  'provider.toAdd': string;
  'provider.toDelete': string;
  'provider.toSelect': string;
  'provider.toQuit': string;
  'provider.page': string;
  'provider.providers': string;
  'provider.selected': string;
  'provider.deleteConfirm.title': string;
  'provider.deleteConfirm.message': string;
  'provider.deleteConfirm.press': string;
  'provider.deleteConfirm.toConfirm': string;
  'provider.deleteConfirm.toCancel': string;
  'provider.deleted': string;
  'provider.selected2': string;
  'provider.moreAbove': string;
  'provider.moreBelow': string;
  'provider.help.navigate': string;
  'provider.help.actions': string;

  // --- ProviderAddForm ---
  'providerAdd.title': string;
  'providerAdd.typeLabel': string;
  'providerAdd.namePlaceholder': string;
  'providerAdd.apiKeyPlaceholder': string;
  'providerAdd.baseUrlPlaceholder': string;
  'providerAdd.save': string;
  'providerAdd.cancel': string;
  'providerAdd.nameRequired': string;
  'providerAdd.saved': string;
  'providerAdd.defaultUrl': string;
  'providerAdd.titleWithType': string;
  'providerAdd.stepName': string;
  'providerAdd.stepBaseUrl': string;
  'providerAdd.stepApiKey': string;
  'providerAdd.stepDefaultModel': string;
  'providerAdd.stepConfirm': string;
  'providerAdd.emptyField': string;
  'providerAdd.confirmTitle': string;
  'providerAdd.confirmEmpty': string;
  'providerAdd.testing': string;
  'providerAdd.pressT': string;
  'providerAdd.pressS': string;
  'providerAdd.help.confirm': string;
  'providerAdd.help.enter': string;
  'providerAdd.help.escBack': string;

  // --- ProviderTypeSelect ---
  'providerType.select': string;
  'providerType.description': string;
  'providerType.title': string;
  'providerType.help.navigate': string;
  'providerType.help.escBack': string;

  // --- ModelAddInput ---
  'modelAdd.title': string;
  'modelAdd.placeholder': string;
  'modelAdd.emptyError': string;
  'modelAdd.saved': string;
  'modelAdd.cancel': string;
  'modelAdd.existingModels': string;
  'modelAdd.existsError': string;
  'modelAdd.addMore': string;
  'modelAdd.help.submit': string;
  'modelAdd.help.escBack': string;

  // --- LoadingIndicator ---
  'loading.default': string;

  // --- ThinkingPanel ---
  'thinking.title': string;

  // --- ToolCallPanel ---
  'tool.running': string;
  'tool.success': string;
  'tool.error': string;
  'tool.approval.needed': string;
  'tool.approval.granted': string;
  'tool.approval.denied': string;

  // --- ResponseBlock ---
  'response.streaming': string;
  'response.done': string;
  'response.error': string;

  // --- Commands (mô tả lệnh) ---
  'cmd.provider.desc': string;
  'cmd.model.desc': string;
  'cmd.toolMode.desc': string;
  'cmd.logs.desc': string;
  'cmd.expand.desc': string;
  'cmd.help.desc': string;
  'cmd.language.desc': string;

  // --- app.tsx command handlers ---
  'app.noProvider': string;
  'app.logs.tail': string;
  'app.logs.all': string;
  'app.logs.cleared': string;
  'app.toolMode.current': string;
  'app.toolMode.switched': string;
  'app.expand.summary': string;
  'app.expand.detail': string;
  'app.help': string;
  'app.language.switched': string;
  'app.language.invalid': string;
  'app.provider.available': string;
  'app.provider.default': string;
}

// ============================================================
// Bản dịch tiếng Việt (giữ nguyên chuỗi hiện tại)
// ============================================================
const vi: Translations = {
  // --- TerminalBottom ---
  'bottom.cmd.notFound': '💡 Không tìm thấy lệnh khớp. Gõ ',
  'bottom.cmd.helpHint': ' để xem danh sách lệnh.',
  'bottom.cmd.press': 'Nhấn ',
  'bottom.cmd.toReturn': ' để quay lại ',
  'bottom.cmd.move': ' di chuyển ',
  'bottom.cmd.select': ' chọn',
  'bottom.stable.label': '🔒 Stable',
  'bottom.stable.frozen': ' — UI đã đóng băng để bảo vệ IME. ',
  'bottom.stable.toOff': ' để tắt.',
  'bottom.placeholder.loading': 'Đang chờ AI trả lời...',
  'bottom.placeholder.default': 'Nhập tin nhắn hoặc lệnh (/). Gõ /help để xem tất cả lệnh...',

  // --- TerminalMid ---
  'mid.empty': 'Chưa có tin nhắn nào. Hãy nhập tin nhắn bên dưới để bắt đầu trò chuyện!',
  'mid.thinking': 'đang suy nghĩ...',
  'mid.phase.analyzing': 'đang phân tích...',
  'mid.phase.planning': 'đang lên kế hoạch...',
  'mid.phase.executing': 'đang thực thi...',
  'mid.phase.responding': 'đang trả lời...',
  'mid.thinkingHint': '  └ (ctrl + o để xem suy nghĩ)',
  'mid.error.invalidMode': 'Lỗi: uiMode không hợp lệ ({mode})',

  // --- AgentModeBar ---
  'mode.normal': 'Thông thường',
  'mode.normal.desc': 'Hỏi trước khi chạy mọi tool',
  'mode.plan': 'Lên kế hoạch',
  'mode.plan.desc': 'Chỉ lên kế hoạch, không chạy tool',
  'mode.acceptEdits': 'Chấp nhận sửa',
  'mode.acceptEdits.desc': 'Tự động sửa file, bash vẫn hỏi',
  'mode.auto': 'Tự động',
  'mode.auto.desc': 'Tự động tất cả tool không cần hỏi',
  'mode.fix': 'Sửa lỗi',
  'mode.fix.desc': 'Vòng lặp sửa lỗi với FIX.md',
  'mode.godMode': 'God Mode',
  'mode.godMode.desc': 'Vòng lặp agent vô tận đến khi xong',
  'mode.hint': 'Tab để chuyển mode · /mode để đổi nhanh',

  // --- ModelMenu ---
  'model.title': '🤖 Model',
  'model.defaultLabel': '(mặc định: ',
  'model.fetching': '⏳ Đang lấy danh sách model từ API...',
  'model.empty': 'Chưa có model nào được thêm.',
  'model.press': 'Nhấn ',
  'model.toFetch': 'để fetch từ API, ',
  'model.toAdd': 'để thêm thủ công, ',
  'model.toQuit': 'để quay lại',
  'model.page': 'Trang ',
  'model.models': ' model',
  'model.moreAbove': '↑ Còn model phía trên',
  'model.defaultTag': '(mặc định)',
  'model.back': '← Chọn model',
  'model.toDelete': 'để xóa, ',
  'model.toSetDefault': 'để đặt mặc định',
  'model.deleteConfirm.title': '🗑️ Xác nhận xóa model',
  'model.deleteConfirm.message': 'Bạn có chắc muốn xóa model ',
  'model.deleteConfirm.from': ' khỏi provider ',
  'model.deleteConfirm.press': 'Nhấn ',
  'model.deleteConfirm.toConfirm': 'để xác nhận, ',
  'model.deleteConfirm.toCancel': 'để hủy',
  'model.deleted': '🗑️ Đã xóa model ',
  'model.setDefault': '⭐ Đã đặt ',
  'model.moreBelow': '↓ Còn model phía dưới',
  'model.help.select': 'Dùng ↑↓ để chọn, Enter để dùng model này chat',
  'model.help.actions': 'Nhấn D đặt mặc định, X xóa, F fetch từ API, A thêm thủ công, Q quay lại',

  // --- ProviderMenu ---
  'provider.title': '🔌 Provider',
  'provider.noProvider': 'Chưa có provider nào được thêm.',
  'provider.press': 'Nhấn ',
  'provider.toAdd': 'để thêm provider, ',
  'provider.toDelete': 'để xóa, ',
  'provider.toSelect': 'để chọn, ',
  'provider.toQuit': 'để quay lại',
  'provider.page': 'Trang ',
  'provider.providers': ' provider',
  'provider.selected': ' (đã chọn)',
  'provider.deleteConfirm.title': '🗑️ Xác nhận xóa provider',
  'provider.deleteConfirm.message': 'Bạn có chắc muốn xóa provider ',
  'provider.deleteConfirm.press': 'Nhấn ',
  'provider.deleteConfirm.toConfirm': 'để xác nhận, ',
  'provider.deleteConfirm.toCancel': 'để hủy',
  'provider.deleted': '🗑️ Đã xóa provider ',
  'provider.selected2': '✅ Đã chọn provider ',
  'provider.moreAbove': '↑ Còn provider phía trên',
  'provider.moreBelow': '↓ Còn provider phía dưới',
  'provider.help.navigate': 'Dùng ↑↓ để chọn, Enter để xác nhận',
  'provider.help.actions': 'Nhấn A để thêm mới, Q để quay lại chat',

  // --- ProviderAddForm ---
  'providerAdd.title': 'Thêm Provider Mới',
  'providerAdd.typeLabel': 'Loại Provider:',
  'providerAdd.namePlaceholder': 'Tên provider (VD: My OpenAI)',
  'providerAdd.apiKeyPlaceholder': 'API Key (nếu cần)',
  'providerAdd.baseUrlPlaceholder': 'Base URL (nếu khác mặc định)',
  'providerAdd.save': 'Lưu',
  'providerAdd.cancel': 'Hủy',
  'providerAdd.nameRequired': 'Tên provider không được để trống.',
  'providerAdd.saved': '✅ Đã lưu provider ',
  'providerAdd.defaultUrl': 'Mặc định: {url}',
  'providerAdd.titleWithType': '➕ Thêm Provider — {type}',
  'providerAdd.stepName': 'Tên provider',
  'providerAdd.stepBaseUrl': 'Base URL',
  'providerAdd.stepApiKey': 'API Key',
  'providerAdd.stepDefaultModel': 'Model mặc định',
  'providerAdd.stepConfirm': 'Xác nhận & Kiểm tra',
  'providerAdd.emptyField': '(để trống)',
  'providerAdd.confirmTitle': '🔍 Xác nhận thông tin provider:',
  'providerAdd.confirmEmpty': '(chưa nhập)',
  'providerAdd.testing': '⏳ Đang kiểm tra kết nối...',
  'providerAdd.pressT': 'Nhấn T để kiểm tra kết nối, ',
  'providerAdd.pressS': 'S để lưu provider',
  'providerAdd.help.confirm': 'Nhấn T để test, S để lưu, Esc để sửa lại',
  'providerAdd.help.enter': 'Nhấn Enter để xác nhận, Esc để ',
  'providerAdd.help.escBack': 'quay lại bước trước',

  // --- ProviderTypeSelect ---
  'providerType.select': 'Chọn loại provider:',
  'providerType.description': 'Mô tả ngắn về loại provider này...',
  'providerType.title': '🔌 Chọn loại Provider',
  'providerType.help.navigate': 'Dùng ↑↓ để chọn, Enter để xác nhận',
  'providerType.help.escBack': 'Nhấn Esc để quay lại danh sách provider',

  // --- ModelAddInput ---
  'modelAdd.title': 'Thêm Model Thủ Công',
  'modelAdd.placeholder': 'Nhập tên model (VD: gpt-4o, claude-sonnet-4-20250514)',
  'modelAdd.emptyError': 'Tên model không được để trống.',
  'modelAdd.saved': '✅ Đã thêm model ',
  'modelAdd.cancel': 'Hủy',
  'modelAdd.existingModels': 'Model hiện có ({count}):',
  'modelAdd.existsError': 'Model "{model}" đã tồn tại.',
  'modelAdd.addMore': 'Đã thêm model "{model}". Nhập tiếp hoặc Esc để quay lại.',
  'modelAdd.help.submit': 'Nhập model ID và nhấn Enter để thêm',
  'modelAdd.help.escBack': 'Nhấn Esc để quay lại danh sách model',

  // --- LoadingIndicator ---
  'loading.default': 'LunaCoding đang trả lời',

  // --- ThinkingPanel ---
  'thinking.title': '🧠 Suy nghĩ',

  // --- ToolCallPanel ---
  'tool.running': 'đang chạy...',
  'tool.success': 'thành công',
  'tool.error': 'lỗi',
  'tool.approval.needed': 'Cần phê duyệt',
  'tool.approval.granted': 'Đã phê duyệt',
  'tool.approval.denied': 'Đã từ chối',

  // --- ResponseBlock ---
  'response.streaming': 'đang nhận...',
  'response.done': 'đã nhận',
  'response.error': 'lỗi',

  // --- Commands ---
  'cmd.provider.desc': 'Quản lý provider — thêm, xoá, chọn provider',
  'cmd.model.desc': 'Quản lý model — chọn model cho provider hiện tại',
  'cmd.toolMode.desc': 'Chế độ gọi tool: auto (tự động), native (API), xml (parse XML từ text)',
  'cmd.logs.desc': 'Xem log hệ thống — /logs (50 dòng cuối), /logs all, /logs clear',
  'cmd.expand.desc': 'Mở rộng/thu gọn toàn bộ thinking và tool (alias: /e)',
  'cmd.help.desc': 'Hiển thị danh sách lệnh và trợ giúp',
  'cmd.language.desc': 'Chuyển đổi ngôn ngữ giao diện — /language vi hoặc /language en',

  // --- app.tsx command handlers ---
  'app.noProvider': 'LunaCoding: Bạn chưa có provider nào được chọn. Dùng lệnh /provider để thêm hoặc chọn provider trước.',
  'app.logs.tail': '📋 **Log hệ thống (50 dòng cuối):**\n```\n{logContent}\n```\n\nDùng `/logs all` để xem toàn bộ, `/logs clear` để xóa.',
  'app.logs.all': '📋 **Toàn bộ log hệ thống:**\n```\n{logContent}\n```',
  'app.logs.cleared': '🧹 Đã xóa toàn bộ log hệ thống.',
  'app.toolMode.current': '🔧 **Chế độ gọi tool hiện tại: `{currentMode}`**\n\nCác chế độ:\n  • `auto`   — Tự động dùng native tool calling (nếu provider hỗ trợ), fallback về XML\n  • `native` — Chỉ dùng native tool calling (qua API)\n  • `xml`    — Chỉ parse XML từ text response\n\nDùng `/tool-mode <chế độ>` để chuyển đổi.',
  'app.toolMode.switched': '🔧 Đã chuyển chế độ gọi tool sang **`{newMode}`**.',
  'app.expand.summary': '📁 Đã chuyển sang chế độ Tóm tắt.',
  'app.expand.detail': '📂 Đã chuyển sang chế độ Chi tiết.',
  'app.help': '📖 **LunaCoding Help**\n\nCác lệnh:\n  `/help` hoặc `/h`     — Hiển thị trợ giúp này\n  `/provider`           — Quản lý provider\n  `/model`              — Quản lý model\n  `/tool-mode` `/tm`    — Chế độ gọi tool\n  `/logs`               — Xem log hệ thống\n  `/expand` `/e`        — Mở rộng/thu gọn thinking & tool\n  `/language` `/lang`   — Đổi ngôn ngữ (vi/en)\n\nPhím tắt:\n  Ctrl+O — Chuyển Tóm tắt ⇄ Chi tiết\n  Tab    — Chuyển chế độ agent',
  'app.language.switched': '🌐 Đã chuyển ngôn ngữ sang **{langName}**.',
  'app.language.invalid': '⚠️ Ngôn ngữ không hợp lệ. Dùng `/language vi` hoặc `/language en`.',
  'app.provider.available': 'Các provider đã thêm:',
  'app.provider.default': 'mặc định',
};

// ============================================================
// Bản dịch tiếng Anh
// ============================================================
const en: Translations = {
  // --- TerminalBottom ---
  'bottom.cmd.notFound': '💡 No matching command found. Type ',
  'bottom.cmd.helpHint': ' to see all commands.',
  'bottom.cmd.press': 'Press ',
  'bottom.cmd.toReturn': ' to go back ',
  'bottom.cmd.move': ' navigate ',
  'bottom.cmd.select': ' select',
  'bottom.stable.label': '🔒 Stable',
  'bottom.stable.frozen': ' — UI frozen to protect IME. ',
  'bottom.stable.toOff': ' to unfreeze.',
  'bottom.placeholder.loading': 'Waiting for AI response...',
  'bottom.placeholder.default': 'Type a message or command (/). Type /help to see all commands...',

  // --- TerminalMid ---
  'mid.empty': 'No messages yet. Type a message below to start chatting!',
  'mid.thinking': 'thinking...',
  'mid.phase.analyzing': 'analyzing...',
  'mid.phase.planning': 'planning...',
  'mid.phase.executing': 'executing...',
  'mid.phase.responding': 'responding...',
  'mid.thinkingHint': '  └ (ctrl + o to view thinking)',
  'mid.error.invalidMode': 'Error: invalid uiMode ({mode})',

  // --- AgentModeBar ---
  'mode.normal': 'Normal',
  'mode.normal.desc': 'Ask before running any tool',
  'mode.plan': 'Plan',
  'mode.plan.desc': 'Only plan, do not run tools',
  'mode.acceptEdits': 'Accept Edits',
  'mode.acceptEdits.desc': 'Auto-edit files, bash still asks',
  'mode.auto': 'Auto',
  'mode.auto.desc': 'Auto-run all tools without asking',
  'mode.fix': 'Fix',
  'mode.fix.desc': 'Fix loop with FIX.md',
  'mode.godMode': 'God Mode',
  'mode.godMode.desc': 'Endless agent loop until done',
  'mode.hint': 'Tab to switch mode · /mode to quick switch',

  // --- ModelMenu ---
  'model.title': '🤖 Model',
  'model.defaultLabel': '(default: ',
  'model.fetching': '⏳ Fetching model list from API...',
  'model.empty': 'No models added yet.',
  'model.press': 'Press ',
  'model.toFetch': 'to fetch from API, ',
  'model.toAdd': 'to add manually, ',
  'model.toQuit': 'to go back',
  'model.page': 'Page ',
  'model.models': ' models',
  'model.moreAbove': '↑ More models above',
  'model.defaultTag': '(default)',
  'model.back': '← Select model',
  'model.toDelete': 'to delete, ',
  'model.toSetDefault': 'to set default',
  'model.deleteConfirm.title': '🗑️ Confirm Delete Model',
  'model.deleteConfirm.message': 'Are you sure you want to delete model ',
  'model.deleteConfirm.from': ' from provider ',
  'model.deleteConfirm.press': 'Press ',
  'model.deleteConfirm.toConfirm': 'to confirm, ',
  'model.deleteConfirm.toCancel': 'to cancel',
  'model.deleted': '🗑️ Deleted model ',
  'model.setDefault': '⭐ Set ',
  'model.moreBelow': '↓ More models below',
  'model.help.select': 'Use ↑↓ to select, Enter to chat with this model',
  'model.help.actions': 'Press D to set default, X to delete, F to fetch from API, A to add manually, Q to go back',

  // --- ProviderMenu ---
  'provider.title': '🔌 Provider',
  'provider.noProvider': 'No providers added yet.',
  'provider.press': 'Press ',
  'provider.toAdd': 'to add provider, ',
  'provider.toDelete': 'to delete, ',
  'provider.toSelect': 'to select, ',
  'provider.toQuit': 'to go back',
  'provider.page': 'Page ',
  'provider.providers': ' providers',
  'provider.selected': ' (selected)',
  'provider.deleteConfirm.title': '🗑️ Confirm Delete Provider',
  'provider.deleteConfirm.message': 'Are you sure you want to delete provider ',
  'provider.deleteConfirm.press': 'Press ',
  'provider.deleteConfirm.toConfirm': 'to confirm, ',
  'provider.deleteConfirm.toCancel': 'to cancel',
  'provider.deleted': '🗑️ Deleted provider ',
  'provider.selected2': '✅ Selected provider ',
  'provider.moreAbove': '↑ More providers above',
  'provider.moreBelow': '↓ More providers below',
  'provider.help.navigate': 'Use ↑↓ to select, Enter to confirm',
  'provider.help.actions': 'Press A to add new, Q to go back to chat',

  // --- ProviderAddForm ---
  'providerAdd.title': 'Add New Provider',
  'providerAdd.typeLabel': 'Provider Type:',
  'providerAdd.namePlaceholder': 'Provider name (e.g. My OpenAI)',
  'providerAdd.apiKeyPlaceholder': 'API Key (if needed)',
  'providerAdd.baseUrlPlaceholder': 'Base URL (if different from default)',
  'providerAdd.save': 'Save',
  'providerAdd.cancel': 'Cancel',
  'providerAdd.nameRequired': 'Provider name cannot be empty.',
  'providerAdd.saved': '✅ Saved provider ',
  'providerAdd.defaultUrl': 'Default: {url}',
  'providerAdd.titleWithType': '➕ Add Provider — {type}',
  'providerAdd.stepName': 'Provider Name',
  'providerAdd.stepBaseUrl': 'Base URL',
  'providerAdd.stepApiKey': 'API Key',
  'providerAdd.stepDefaultModel': 'Default Model',
  'providerAdd.stepConfirm': 'Confirm & Test',
  'providerAdd.emptyField': '(empty)',
  'providerAdd.confirmTitle': '🔍 Confirm provider details:',
  'providerAdd.confirmEmpty': '(not entered)',
  'providerAdd.testing': '⏳ Testing connection...',
  'providerAdd.pressT': 'Press T to test connection, ',
  'providerAdd.pressS': 'S to save provider',
  'providerAdd.help.confirm': 'Press T to test, S to save, Esc to go back',
  'providerAdd.help.enter': 'Press Enter to confirm, Esc to ',
  'providerAdd.help.escBack': 'go back to previous step',

  // --- ProviderTypeSelect ---
  'providerType.select': 'Select provider type:',
  'providerType.description': 'Brief description of this provider type...',
  'providerType.title': '🔌 Select Provider Type',
  'providerType.help.navigate': 'Use ↑↓ to select, Enter to confirm',
  'providerType.help.escBack': 'Press Esc to go back to provider list',

  // --- ModelAddInput ---
  'modelAdd.title': 'Add Model Manually',
  'modelAdd.placeholder': 'Enter model name (e.g. gpt-4o, claude-sonnet-4-20250514)',
  'modelAdd.emptyError': 'Model name cannot be empty.',
  'modelAdd.saved': '✅ Added model ',
  'modelAdd.cancel': 'Cancel',
  'modelAdd.existingModels': 'Existing models ({count}):',
  'modelAdd.existsError': 'Model "{model}" already exists.',
  'modelAdd.addMore': 'Added model "{model}". Continue typing or Esc to go back.',
  'modelAdd.help.submit': 'Enter model ID and press Enter to add',
  'modelAdd.help.escBack': 'Press Esc to go back to model list',

  // --- LoadingIndicator ---
  'loading.default': 'LunaCoding is responding',

  // --- ThinkingPanel ---
  'thinking.title': '🧠 Thinking',

  // --- ToolCallPanel ---
  'tool.running': 'running...',
  'tool.success': 'success',
  'tool.error': 'error',
  'tool.approval.needed': 'Approval needed',
  'tool.approval.granted': 'Approved',
  'tool.approval.denied': 'Denied',

  // --- ResponseBlock ---
  'response.streaming': 'streaming...',
  'response.done': 'done',
  'response.error': 'error',

  // --- Commands ---
  'cmd.provider.desc': 'Manage providers — add, delete, select provider',
  'cmd.model.desc': 'Manage models — select model for current provider',
  'cmd.toolMode.desc': 'Tool calling mode: auto (automatic), native (API), xml (parse XML from text)',
  'cmd.logs.desc': 'View system logs — /logs (last 50 lines), /logs all, /logs clear',
  'cmd.expand.desc': 'Expand/collapse all thinking and tool panels (alias: /e)',
  'cmd.help.desc': 'Show command list and help',
  'cmd.language.desc': 'Switch UI language — /language vi or /language en',

  // --- app.tsx command handlers ---
  'app.noProvider': 'LunaCoding: You have no provider selected. Use /provider to add or select a provider first.',
  'app.logs.tail': '📋 **System Log (last 50 lines):**\n```\n{logContent}\n```\n\nUse `/logs all` to view all, `/logs clear` to clear.',
  'app.logs.all': '📋 **Full System Log:**\n```\n{logContent}\n```',
  'app.logs.cleared': '🧹 Cleared all system logs.',
  'app.toolMode.current': '🔧 **Current tool mode: `{currentMode}`**\n\nModes:\n  • `auto`   — Auto native tool calling (if provider supports), fallback to XML\n  • `native` — Native tool calling only (via API)\n  • `xml`    — Parse XML from text response only\n\nUse `/tool-mode <mode>` to switch.',
  'app.toolMode.switched': '🔧 Switched tool mode to **`{newMode}`**.',
  'app.expand.summary': '📁 Switched to Summary mode.',
  'app.expand.detail': '📂 Switched to Detail mode.',
  'app.help': '📖 **LunaCoding Help**\n\nCommands:\n  `/help` or `/h`     — Show this help\n  `/provider`         — Manage providers\n  `/model`            — Manage models\n  `/tool-mode` `/tm`  — Tool calling mode\n  `/logs`             — View system logs\n  `/expand` `/e`      — Expand/collapse thinking & tools\n  `/language` `/lang` — Switch language (vi/en)\n\nShortcuts:\n  Ctrl+O — Toggle Summary ⇄ Detail\n  Tab    — Switch agent mode',
  'app.language.switched': '🌐 Switched language to **{langName}**.',
  'app.language.invalid': '⚠️ Invalid language. Use `/language vi` or `/language en`.',
  'app.provider.available': 'Available providers:',
  'app.provider.default': 'default',
};

// ============================================================
// Module state & API
// ============================================================

let currentLanguage: Language = 'en';

/**
 * Lấy chuỗi dịch theo key và ngôn ngữ hiện tại.
 * Hỗ trợ thay thế placeholder dạng {key} bằng giá trị từ params.
 */
export function t<K extends keyof Translations>(
  key: K,
  params?: Record<string, string>,
): string {
  const translations: Translations = currentLanguage === 'vi' ? vi : en;
  let text: string = translations[key] ?? key;

  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replaceAll(`{${k}}`, v);
    }
  }

  return text;
}

/** Đặt ngôn ngữ hiện tại */
export function setLanguage(lang: Language): void {
  currentLanguage = lang;
}

/** Lấy ngôn ngữ hiện tại */
export function getLanguage(): Language {
  return currentLanguage;
}

/** Khởi tạo ngôn ngữ từ giá trị đã lưu */
export function initLanguage(saved?: string): void {
  if (saved === 'vi' || saved === 'en') {
    currentLanguage = saved;
  }
}

export default { t, setLanguage, getLanguage, initLanguage };