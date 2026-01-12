import { Hono } from 'hono'
import { cors } from 'hono/cors'

const app = new Hono()

// CORS設定
app.use('/api/*', cors())

// API: スプレッドシートデータ取得
app.get('/api/data', async (c) => {
  try {
    // Google Sheets CSV Export URL
    const SHEET_ID = '1vKrYCzaw-miJOY52oskNoMfn-uEHIolBMhC7uMxxN_M'
    const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`
    
    const response = await fetch(CSV_URL)
    if (!response.ok) {
      throw new Error('Failed to fetch spreadsheet data')
    }
    
    const csvText = await response.text()
    const parsedData = parseCSV(csvText)
    
    return c.json({
      success: true,
      data: parsedData
    })
  } catch (error) {
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// 改良版CSVパーサー（改行とクォートを正しく処理）
function parseCSV(csvText: string) {
  const rows: string[][] = []
  const chars = csvText.split('')
  let currentField = ''
  let currentRow: string[] = []
  let insideQuotes = false
  
  for (let i = 0; i < chars.length; i++) {
    const char = chars[i]
    const nextChar = chars[i + 1]
    
    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        // エスケープされたクォート
        currentField += '"'
        i++ // 次の文字をスキップ
      } else {
        // クォートの開始/終了
        insideQuotes = !insideQuotes
      }
    } else if (char === ',' && !insideQuotes) {
      // フィールドの区切り
      currentRow.push(currentField.trim())
      currentField = ''
    } else if (char === '\n' && !insideQuotes) {
      // 行の終わり
      currentRow.push(currentField.trim())
      if (currentRow.some(field => field.length > 0)) {
        rows.push(currentRow)
      }
      currentRow = []
      currentField = ''
    } else if (char === '\r' && nextChar === '\n' && !insideQuotes) {
      // Windows改行 (\r\n)
      currentRow.push(currentField.trim())
      if (currentRow.some(field => field.length > 0)) {
        rows.push(currentRow)
      }
      currentRow = []
      currentField = ''
      i++ // \nをスキップ
    } else {
      currentField += char
    }
  }
  
  // 最後のフィールドと行を追加
  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField.trim())
    if (currentRow.some(field => field.length > 0)) {
      rows.push(currentRow)
    }
  }
  
  if (rows.length === 0) return []
  
  const headers = rows[0]
  const data = []
  
  for (let i = 1; i < rows.length; i++) {
    const row: any = {}
    headers.forEach((header, index) => {
      row[header] = rows[i][index] || ''
    })
    data.push(row)
  }
  
  return data
}

// メインページ
app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ja">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>WannaV わなみさん使用ログ分析</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/dayjs@1.11.10/dayjs.min.js"></script>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
    </head>
    <body class="bg-gray-50">
        <div class="min-h-screen">
            <!-- ヘッダー -->
            <header class="bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg">
                <div class="container mx-auto px-4 py-6">
                    <div class="flex items-center justify-between">
                        <div>
                            <h1 class="text-3xl font-bold flex items-center gap-3">
                                <i class="fas fa-chart-line"></i>
                                WannaV わなみさん使用ログ分析
                            </h1>
                        </div>
                        <!-- エクスポートボタン -->
                        <div class="flex gap-3">
                            <button id="export-csv-btn" class="bg-white text-purple-600 px-4 py-2 rounded-lg font-bold hover:bg-purple-50 transition flex items-center gap-2">
                                <i class="fas fa-file-csv"></i>
                                CSV出力
                            </button>
                            <button id="export-pdf-btn" class="bg-white text-pink-600 px-4 py-2 rounded-lg font-bold hover:bg-pink-50 transition flex items-center gap-2">
                                <i class="fas fa-file-pdf"></i>
                                PDF出力
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <!-- メインコンテンツ -->
            <main class="container mx-auto px-4 py-8">
                <!-- ローディング表示 -->
                <div id="loading" class="text-center py-12">
                    <i class="fas fa-spinner fa-spin text-4xl text-purple-600"></i>
                    <p class="mt-4 text-gray-600">データを読み込んでいます...</p>
                </div>

                <!-- エラー表示 -->
                <div id="error" class="hidden bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                    <i class="fas fa-exclamation-circle text-3xl text-red-500"></i>
                    <p class="mt-2 text-red-700" id="error-message"></p>
                </div>

                <!-- 統計情報 -->
                <div id="stats" class="hidden grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div class="bg-white rounded-lg shadow-md p-6">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-gray-500 text-sm">総使用回数</p>
                                <p class="text-3xl font-bold text-purple-600" id="total-count">0</p>
                            </div>
                            <i class="fas fa-comments text-4xl text-purple-200"></i>
                        </div>
                    </div>
                    <div class="bg-white rounded-lg shadow-md p-6">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-gray-500 text-sm">ユニークユーザー</p>
                                <p class="text-3xl font-bold text-pink-600" id="unique-users">0</p>
                            </div>
                            <i class="fas fa-users text-4xl text-pink-200"></i>
                        </div>
                    </div>
                    <div class="bg-white rounded-lg shadow-md p-6">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-gray-500 text-sm">データ期間</p>
                                <p class="text-lg font-bold text-blue-600" id="date-range">-</p>
                            </div>
                            <i class="fas fa-calendar text-4xl text-blue-200"></i>
                        </div>
                    </div>
                    <div class="bg-white rounded-lg shadow-md p-6">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-gray-500 text-sm">1日平均</p>
                                <p class="text-3xl font-bold text-green-600" id="daily-avg">0</p>
                            </div>
                            <i class="fas fa-chart-bar text-4xl text-green-200"></i>
                        </div>
                    </div>
                </div>

                <!-- グラフ3列レイアウト -->
                <div id="charts-row" class="hidden grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    <!-- 日次グラフ -->
                    <div class="bg-white rounded-lg shadow-md p-6">
                        <div class="flex items-center justify-between mb-4">
                            <h2 class="text-xl font-bold text-gray-800 flex items-center gap-2">
                                <i class="fas fa-calendar-day text-purple-600"></i>
                                日次使用回数
                            </h2>
                            <div class="flex items-center gap-2">
                                <label class="text-sm text-gray-600">表示月:</label>
                                <select id="month-selector" class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none text-sm">
                                </select>
                            </div>
                        </div>
                        <div class="relative" style="height: 300px;">
                            <canvas id="daily-chart"></canvas>
                        </div>
                    </div>

                    <!-- 月次グラフ -->
                    <div class="bg-white rounded-lg shadow-md p-6">
                        <h2 class="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <i class="fas fa-calendar-alt text-pink-600"></i>
                            月次使用回数
                        </h2>
                        <div class="relative" style="height: 300px;">
                            <canvas id="monthly-chart"></canvas>
                        </div>
                    </div>

                    <!-- 時間帯分析グラフ -->
                    <div class="bg-white rounded-lg shadow-md p-6">
                        <h2 class="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <i class="fas fa-clock text-blue-600"></i>
                            時間帯別使用回数
                        </h2>
                        <div class="relative" style="height: 300px;">
                            <canvas id="hourly-chart"></canvas>
                        </div>
                    </div>

                    <!-- 質問カテゴリ分析 -->
                    <div class="bg-white rounded-lg shadow-md p-6">
                        <h2 class="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <i class="fas fa-tags text-green-600"></i>
                            質問タイプ別統計
                        </h2>
                        <div class="relative" style="height: 300px;">
                            <canvas id="category-chart"></canvas>
                        </div>
                    </div>
                </div>

                <!-- ユーザーランキング -->
                <div id="ranking-container" class="hidden bg-white rounded-lg shadow-md p-6">
                    <div class="flex items-center justify-between mb-4">
                        <h2 class="text-xl font-bold text-gray-800 flex items-center gap-2">
                            <i class="fas fa-trophy text-yellow-500"></i>
                            使用ユーザーランキング
                        </h2>
                        <div class="flex items-center gap-2">
                            <label class="text-sm text-gray-600">集計月:</label>
                            <select id="ranking-month-selector" class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:outline-none text-sm">
                            </select>
                        </div>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="min-w-full divide-y divide-gray-200">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">順位</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">生徒名</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">学籍番号</th>
                                    <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">使用回数</th>
                                </tr>
                            </thead>
                            <tbody id="ranking-body" class="bg-white divide-y divide-gray-200">
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>

            <!-- フッター -->
            <footer class="bg-gray-800 text-white py-6 mt-12">
                <div class="container mx-auto px-4 text-center">
                    <p>&copy; 2025 WannaV VTuber育成スクール</p>
                </div>
            </footer>
        </div>

        <!-- 生徒詳細モーダル -->
        <div id="student-modal" class="hidden fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div class="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
                <div class="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6 flex items-center justify-between">
                    <div>
                        <h3 class="text-2xl font-bold" id="modal-student-name"></h3>
                        <p class="text-purple-100 mt-1" id="modal-student-id"></p>
                    </div>
                    <button id="close-modal" class="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition">
                        <i class="fas fa-times text-2xl"></i>
                    </button>
                </div>
                <div class="p-6 overflow-y-auto" style="max-height: calc(90vh - 140px);">
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div class="bg-purple-50 rounded-lg p-4">
                            <p class="text-gray-600 text-sm">総使用回数</p>
                            <p class="text-3xl font-bold text-purple-600" id="modal-total-count">0</p>
                        </div>
                        <div class="bg-pink-50 rounded-lg p-4">
                            <p class="text-gray-600 text-sm">最終利用日</p>
                            <p class="text-lg font-bold text-pink-600" id="modal-last-used">-</p>
                        </div>
                        <div class="bg-blue-50 rounded-lg p-4">
                            <p class="text-gray-600 text-sm">よく使う時間帯</p>
                            <p class="text-lg font-bold text-blue-600" id="modal-peak-hour">-</p>
                        </div>
                    </div>
                    <h4 class="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                        <i class="fas fa-history text-purple-600"></i>
                        質問履歴
                    </h4>
                    <div id="modal-questions" class="space-y-3">
                        <!-- 質問履歴がここに挿入される -->
                    </div>
                </div>
            </div>
        </div>

        <script>
            let allData = [];
            let dailyChart = null;
            let monthlyChart = null;
            let hourlyChart = null;
            let categoryChart = null;

            // データ取得と初期化
            async function init() {
                try {
                    const response = await fetch('/api/data');
                    const result = await response.json();
                    
                    if (!result.success) {
                        throw new Error(result.error);
                    }
                    
                    // データフィルタリング（WannaV Tutors Community を除外）
                    allData = result.data.filter(row => {
                        return row['サーバー名'] !== 'WannaV Tutors Community';
                    });
                    
                    // 表示
                    document.getElementById('loading').classList.add('hidden');
                    document.getElementById('stats').classList.remove('hidden');
                    document.getElementById('charts-row').classList.remove('hidden');
                    document.getElementById('ranking-container').classList.remove('hidden');
                    
                    // 各種データ表示
                    updateStats();
                    populateMonthSelector();
                    populateRankingMonthSelector();
                    updateDailyChart();
                    updateMonthlyChart();
                    updateHourlyChart();
                    updateCategoryChart();
                    updateRanking();
                    
                    // エクスポートボタンのイベント設定
                    document.getElementById('export-csv-btn').addEventListener('click', exportCSV);
                    document.getElementById('export-pdf-btn').addEventListener('click', exportPDF);
                    
                } catch (error) {
                    document.getElementById('loading').classList.add('hidden');
                    document.getElementById('error').classList.remove('hidden');
                    document.getElementById('error-message').textContent = 'データの読み込みに失敗しました: ' + error.message;
                    console.error('Error:', error);
                }
            }

            // 統計情報更新
            function updateStats() {
                const totalCount = allData.length;
                
                // ユニークユーザー（生徒名ベース）
                const uniqueUsers = new Set(
                    allData
                        .filter(row => row['生徒名'] && row['生徒名'].trim())
                        .map(row => row['生徒名'])
                ).size;
                
                // 日付範囲
                const dates = allData
                    .map(row => new Date(row['タイムスタンプ']))
                    .filter(d => !isNaN(d.getTime()))
                    .sort((a, b) => a - b);
                
                const dateRange = dates.length > 0 
                    ? dayjs(dates[0]).format('YYYY/MM/DD') + ' - ' + dayjs(dates[dates.length - 1]).format('YYYY/MM/DD')
                    : '-';
                
                // 1日平均
                const dayCount = dates.length > 0 
                    ? Math.ceil((dates[dates.length - 1] - dates[0]) / (1000 * 60 * 60 * 24)) + 1
                    : 1;
                const dailyAvg = (totalCount / dayCount).toFixed(1);
                
                document.getElementById('total-count').textContent = totalCount.toLocaleString();
                document.getElementById('unique-users').textContent = uniqueUsers;
                document.getElementById('date-range').textContent = dateRange;
                document.getElementById('daily-avg').textContent = dailyAvg;
            }

            // 月セレクター生成
            function populateMonthSelector() {
                const months = new Set();
                allData.forEach(row => {
                    const date = new Date(row['タイムスタンプ']);
                    if (!isNaN(date.getTime())) {
                        const monthKey = dayjs(date).format('YYYY-MM');
                        months.add(monthKey);
                    }
                });
                
                const sortedMonths = Array.from(months).sort();
                const selector = document.getElementById('month-selector');
                
                sortedMonths.forEach(month => {
                    const option = document.createElement('option');
                    option.value = month;
                    option.textContent = dayjs(month).format('YYYY年MM月');
                    selector.appendChild(option);
                });
                
                // 最新月を選択
                if (sortedMonths.length > 0) {
                    selector.value = sortedMonths[sortedMonths.length - 1];
                }
                
                selector.addEventListener('change', updateDailyChart);
            }

            // 日次グラフ更新
            function updateDailyChart() {
                const selectedMonth = document.getElementById('month-selector').value;
                
                // 選択月のデータをフィルタ
                const monthData = allData.filter(row => {
                    const date = new Date(row['タイムスタンプ']);
                    return dayjs(date).format('YYYY-MM') === selectedMonth;
                });
                
                // 日付ごとにカウント
                const dailyCounts = {};
                monthData.forEach(row => {
                    const date = dayjs(new Date(row['タイムスタンプ'])).format('YYYY-MM-DD');
                    dailyCounts[date] = (dailyCounts[date] || 0) + 1;
                });
                
                // 日付順にソート
                const sortedDates = Object.keys(dailyCounts).sort();
                const counts = sortedDates.map(date => dailyCounts[date]);
                const labels = sortedDates.map(date => dayjs(date).format('MM/DD'));
                
                // グラフ描画
                const ctx = document.getElementById('daily-chart').getContext('2d');
                
                if (dailyChart) {
                    dailyChart.destroy();
                }
                
                dailyChart = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: labels,
                        datasets: [{
                            label: '使用回数',
                            data: counts,
                            borderColor: 'rgb(147, 51, 234)',
                            backgroundColor: 'rgba(147, 51, 234, 0.1)',
                            borderWidth: 3,
                            tension: 0.4,
                            fill: true,
                            pointRadius: 4,
                            pointHoverRadius: 6
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                display: true,
                                position: 'top'
                            },
                            tooltip: {
                                mode: 'index',
                                intersect: false
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                ticks: {
                                    stepSize: 1
                                }
                            }
                        }
                    }
                });
            }

            // 月次グラフ更新
            function updateMonthlyChart() {
                // 月ごとにカウント
                const monthlyCounts = {};
                allData.forEach(row => {
                    const date = new Date(row['タイムスタンプ']);
                    if (!isNaN(date.getTime())) {
                        const month = dayjs(date).format('YYYY-MM');
                        monthlyCounts[month] = (monthlyCounts[month] || 0) + 1;
                    }
                });
                
                // 月順にソート
                const sortedMonths = Object.keys(monthlyCounts).sort();
                const counts = sortedMonths.map(month => monthlyCounts[month]);
                const labels = sortedMonths.map(month => dayjs(month).format('YYYY年MM月'));
                
                // グラフ描画
                const ctx = document.getElementById('monthly-chart').getContext('2d');
                
                if (monthlyChart) {
                    monthlyChart.destroy();
                }
                
                monthlyChart = new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: labels,
                        datasets: [{
                            label: '月間使用回数',
                            data: counts,
                            backgroundColor: 'rgba(236, 72, 153, 0.7)',
                            borderColor: 'rgb(236, 72, 153)',
                            borderWidth: 2
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                display: true,
                                position: 'top'
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                ticks: {
                                    stepSize: 1
                                }
                            }
                        }
                    }
                });
            }

            // 時間帯グラフ更新
            function updateHourlyChart() {
                // 時間帯ごとにカウント（0-23時）
                const hourlyCounts = Array(24).fill(0);
                
                allData.forEach(row => {
                    const date = new Date(row['タイムスタンプ']);
                    if (!isNaN(date.getTime())) {
                        const hour = date.getHours();
                        hourlyCounts[hour]++;
                    }
                });
                
                const labels = Array.from({length: 24}, (_, i) => i + '時');
                
                // グラフ描画
                const ctx = document.getElementById('hourly-chart').getContext('2d');
                
                if (hourlyChart) {
                    hourlyChart.destroy();
                }
                
                hourlyChart = new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: labels,
                        datasets: [{
                            label: '時間帯別使用回数',
                            data: hourlyCounts,
                            backgroundColor: 'rgba(59, 130, 246, 0.7)',
                            borderColor: 'rgb(59, 130, 246)',
                            borderWidth: 2
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                display: true,
                                position: 'top'
                            },
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        return '使用回数: ' + context.parsed.y + '回';
                                    }
                                }
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                ticks: {
                                    stepSize: 1
                                }
                            }
                        }
                    }
                });
            }

            // カテゴリグラフ更新
            function updateCategoryChart() {
                // カテゴリごとにカウント
                const categoryCounts = {};
                
                allData.forEach(row => {
                    const category = row['質問タイプ'] || 'その他';
                    categoryCounts[category] = (categoryCounts[category] || 0) + 1;
                });
                
                // 降順ソート
                const sortedCategories = Object.entries(categoryCounts)
                    .sort((a, b) => b[1] - a[1]);
                
                const labels = sortedCategories.map(item => item[0]);
                const counts = sortedCategories.map(item => item[1]);
                
                // カラーパレット
                const colors = [
                    'rgba(16, 185, 129, 0.7)',
                    'rgba(251, 191, 36, 0.7)',
                    'rgba(239, 68, 68, 0.7)',
                    'rgba(139, 92, 246, 0.7)',
                    'rgba(236, 72, 153, 0.7)',
                    'rgba(59, 130, 246, 0.7)',
                    'rgba(245, 158, 11, 0.7)',
                    'rgba(6, 182, 212, 0.7)'
                ];
                
                // グラフ描画
                const ctx = document.getElementById('category-chart').getContext('2d');
                
                if (categoryChart) {
                    categoryChart.destroy();
                }
                
                categoryChart = new Chart(ctx, {
                    type: 'doughnut',
                    data: {
                        labels: labels,
                        datasets: [{
                            label: '質問数',
                            data: counts,
                            backgroundColor: colors.slice(0, labels.length),
                            borderColor: colors.slice(0, labels.length).map(c => c.replace('0.7', '1')),
                            borderWidth: 2
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                display: true,
                                position: 'right'
                            },
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                        const percentage = ((context.parsed / total) * 100).toFixed(1);
                                        return context.label + ': ' + context.parsed + '回 (' + percentage + '%)';
                                    }
                                }
                            }
                        }
                    }
                });
            }

            // ランキング月セレクター生成
            function populateRankingMonthSelector() {
                const months = new Set();
                allData.forEach(row => {
                    const date = new Date(row['タイムスタンプ']);
                    if (!isNaN(date.getTime())) {
                        const monthKey = dayjs(date).format('YYYY-MM');
                        months.add(monthKey);
                    }
                });
                
                const sortedMonths = Array.from(months).sort();
                const selector = document.getElementById('ranking-month-selector');
                selector.innerHTML = '';
                
                // 「全期間」オプションを追加
                const allOption = document.createElement('option');
                allOption.value = 'all';
                allOption.textContent = '全期間';
                selector.appendChild(allOption);
                
                sortedMonths.forEach(month => {
                    const option = document.createElement('option');
                    option.value = month;
                    option.textContent = dayjs(month).format('YYYY年MM月');
                    selector.appendChild(option);
                });
                
                // 今月をデフォルト選択
                const currentMonth = dayjs().format('YYYY-MM');
                if (sortedMonths.includes(currentMonth)) {
                    selector.value = currentMonth;
                } else if (sortedMonths.length > 0) {
                    selector.value = sortedMonths[sortedMonths.length - 1];
                }
                
                selector.addEventListener('change', updateRanking);
            }

            // ランキング更新（月次対応）
            function updateRanking() {
                const selectedMonth = document.getElementById('ranking-month-selector').value;
                
                // 選択月でフィルタ
                let filteredData = allData;
                if (selectedMonth !== 'all') {
                    filteredData = allData.filter(row => {
                        const date = new Date(row['タイムスタンプ']);
                        return dayjs(date).format('YYYY-MM') === selectedMonth;
                    });
                }
                
                // ユーザーごとにカウント
                const userCounts = {};
                filteredData.forEach(row => {
                    const studentName = row['生徒名'] || '';
                    const studentId = row['学籍番号'] || '';
                    
                    if (studentName.trim()) {
                        const key = studentName + '|' + studentId;
                        if (!userCounts[key]) {
                            userCounts[key] = {
                                name: studentName,
                                id: studentId,
                                count: 0
                            };
                        }
                        userCounts[key].count++;
                    }
                });
                
                // 降順ソート
                const sortedUsers = Object.values(userCounts).sort((a, b) => b.count - a.count);
                
                // テーブル生成
                const tbody = document.getElementById('ranking-body');
                tbody.innerHTML = '';
                
                sortedUsers.forEach((user, index) => {
                    const tr = document.createElement('tr');
                    tr.className = index % 2 === 0 ? 'bg-white hover:bg-purple-50' : 'bg-gray-50 hover:bg-purple-50';
                    tr.style.cursor = 'pointer';
                    tr.style.transition = 'background-color 0.2s';
                    
                    // 順位に応じたバッジ
                    let rankBadge = index + 1;
                    if (index === 0) {
                        rankBadge = '<span class="text-yellow-500 font-bold text-xl">🥇 1</span>';
                    } else if (index === 1) {
                        rankBadge = '<span class="text-gray-400 font-bold text-xl">🥈 2</span>';
                    } else if (index === 2) {
                        rankBadge = '<span class="text-orange-600 font-bold text-xl">🥉 3</span>';
                    }
                    
                    tr.innerHTML = \`
                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">\${rankBadge}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium text-purple-600 hover:underline">\${user.name}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">\${user.id}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-bold">\${user.count.toLocaleString()}</td>
                    \`;
                    
                    // クリックイベント
                    tr.addEventListener('click', () => showStudentDetail(user.name, user.id));
                    
                    tbody.appendChild(tr);
                });
            }

            // 生徒詳細モーダル表示
            function showStudentDetail(studentName, studentId) {
                // 生徒のデータを抽出
                const studentData = allData.filter(row => 
                    row['生徒名'] === studentName && row['学籍番号'] === studentId
                );
                
                if (studentData.length === 0) return;
                
                // モーダルに情報を設定
                document.getElementById('modal-student-name').textContent = studentName;
                document.getElementById('modal-student-id').textContent = '学籍番号: ' + studentId;
                document.getElementById('modal-total-count').textContent = studentData.length;
                
                // 最終利用日
                const dates = studentData.map(row => new Date(row['タイムスタンプ'])).sort((a, b) => b - a);
                document.getElementById('modal-last-used').textContent = dayjs(dates[0]).format('YYYY/MM/DD HH:mm');
                
                // よく使う時間帯
                const hourCounts = {};
                studentData.forEach(row => {
                    const hour = new Date(row['タイムスタンプ']).getHours();
                    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
                });
                const peakHour = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0];
                document.getElementById('modal-peak-hour').textContent = peakHour ? peakHour[0] + '時台' : '-';
                
                // 質問履歴を表示
                const questionsDiv = document.getElementById('modal-questions');
                questionsDiv.innerHTML = '';
                
                // 日付順にソート（新しい順）
                const sortedData = [...studentData].sort((a, b) => 
                    new Date(b['タイムスタンプ']) - new Date(a['タイムスタンプ'])
                );
                
                sortedData.forEach((row, index) => {
                    const questionDiv = document.createElement('div');
                    questionDiv.className = 'border border-gray-200 rounded-lg p-4 hover:shadow-md transition';
                    
                    const date = dayjs(new Date(row['タイムスタンプ'])).format('YYYY/MM/DD HH:mm');
                    const questionType = row['質問タイプ'] || 'その他';
                    const question = row['質問内容'] || '(質問内容なし)';
                    const answer = row['回答内容'] || '(回答なし)';
                    
                    // 質問タイプの色分け
                    let typeColor = 'bg-gray-100 text-gray-700';
                    if (questionType === 'lesson_question') typeColor = 'bg-green-100 text-green-700';
                    else if (questionType === 'sns_consultation') typeColor = 'bg-blue-100 text-blue-700';
                    else if (questionType === '通常質問') typeColor = 'bg-purple-100 text-purple-700';
                    
                    questionDiv.innerHTML = \`
                        <div class="flex items-center justify-between mb-2">
                            <span class="text-xs text-gray-500"><i class="fas fa-clock mr-1"></i>\${date}</span>
                            <span class="text-xs px-2 py-1 rounded \${typeColor}">\${questionType}</span>
                        </div>
                        <div class="mb-2">
                            <p class="text-sm font-medium text-gray-900 mb-1"><i class="fas fa-question-circle text-purple-600 mr-1"></i>質問:</p>
                            <p class="text-sm text-gray-700 pl-5">\${question}</p>
                        </div>
                        <details class="text-sm">
                            <summary class="cursor-pointer text-pink-600 hover:text-pink-700 font-medium">
                                <i class="fas fa-comment-dots mr-1"></i>回答を表示
                            </summary>
                            <p class="text-sm text-gray-600 mt-2 pl-5 border-l-2 border-pink-200">\${answer.substring(0, 500)}\${answer.length > 500 ? '...' : ''}</p>
                        </details>
                    \`;
                    
                    questionsDiv.appendChild(questionDiv);
                });
                
                // モーダル表示
                document.getElementById('student-modal').classList.remove('hidden');
            }

            // モーダルを閉じる
            document.addEventListener('DOMContentLoaded', () => {
                const modal = document.getElementById('student-modal');
                const closeBtn = document.getElementById('close-modal');
                
                closeBtn.addEventListener('click', () => {
                    modal.classList.add('hidden');
                });
                
                // モーダル背景クリックで閉じる
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        modal.classList.add('hidden');
                    }
                });
                
                // ESCキーで閉じる
                document.addEventListener('keydown', (e) => {
                    if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
                        modal.classList.add('hidden');
                    }
                });
            });

            // CSV エクスポート
            function exportCSV() {
                // ヘッダー
                const headers = ['順位', '生徒名', '学籍番号', '使用回数'];
                
                // ユーザーごとにカウント
                const userCounts = {};
                allData.forEach(row => {
                    const studentName = row['生徒名'] || '';
                    const studentId = row['学籍番号'] || '';
                    
                    if (studentName.trim()) {
                        const key = studentName + '|' + studentId;
                        if (!userCounts[key]) {
                            userCounts[key] = {
                                name: studentName,
                                id: studentId,
                                count: 0
                            };
                        }
                        userCounts[key].count++;
                    }
                });
                
                const sortedUsers = Object.values(userCounts).sort((a, b) => b.count - a.count);
                
                // CSV作成
                let csv = headers.join(',') + '\\n';
                sortedUsers.forEach((user, index) => {
                    csv += \`\${index + 1},"\${user.name}","\${user.id}",\${user.count}\\n\`;
                });
                
                // ダウンロード
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement('a');
                const url = URL.createObjectURL(blob);
                link.setAttribute('href', url);
                link.setAttribute('download', \`wannav_usage_report_\${dayjs().format('YYYYMMDD')}.csv\`);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }

            // PDF エクスポート
            async function exportPDF() {
                const { jsPDF } = window.jspdf;
                const pdf = new jsPDF('p', 'mm', 'a4');
                
                // タイトル
                pdf.setFontSize(18);
                pdf.text('WannaV わなみさん使用ログレポート', 105, 20, { align: 'center' });
                
                pdf.setFontSize(10);
                pdf.text(\`生成日: \${dayjs().format('YYYY年MM月DD日')}\`, 105, 28, { align: 'center' });
                
                // 統計情報
                pdf.setFontSize(12);
                pdf.text('統計情報', 20, 40);
                
                pdf.setFontSize(10);
                const totalCount = document.getElementById('total-count').textContent;
                const uniqueUsers = document.getElementById('unique-users').textContent;
                const dateRange = document.getElementById('date-range').textContent;
                const dailyAvg = document.getElementById('daily-avg').textContent;
                
                pdf.text(\`総使用回数: \${totalCount}\`, 20, 50);
                pdf.text(\`ユニークユーザー: \${uniqueUsers}\`, 20, 58);
                pdf.text(\`データ期間: \${dateRange}\`, 20, 66);
                pdf.text(\`1日平均: \${dailyAvg}\`, 20, 74);
                
                // グラフをキャプチャ
                let yPos = 90;
                
                // 日次グラフ
                const dailyCanvas = document.getElementById('daily-chart');
                const dailyImg = dailyCanvas.toDataURL('image/png');
                pdf.addPage();
                pdf.setFontSize(12);
                pdf.text('日次使用回数', 20, 20);
                pdf.addImage(dailyImg, 'PNG', 20, 30, 170, 100);
                
                // 月次グラフ
                const monthlyCanvas = document.getElementById('monthly-chart');
                const monthlyImg = monthlyCanvas.toDataURL('image/png');
                pdf.addPage();
                pdf.setFontSize(12);
                pdf.text('月次使用回数', 20, 20);
                pdf.addImage(monthlyImg, 'PNG', 20, 30, 170, 100);
                
                // 時間帯グラフ
                const hourlyCanvas = document.getElementById('hourly-chart');
                const hourlyImg = hourlyCanvas.toDataURL('image/png');
                pdf.addPage();
                pdf.setFontSize(12);
                pdf.text('時間帯別使用回数', 20, 20);
                pdf.addImage(hourlyImg, 'PNG', 20, 30, 170, 100);
                
                // カテゴリグラフ
                const categoryCanvas = document.getElementById('category-chart');
                const categoryImg = categoryCanvas.toDataURL('image/png');
                pdf.addPage();
                pdf.setFontSize(12);
                pdf.text('質問タイプ別統計', 20, 20);
                pdf.addImage(categoryImg, 'PNG', 20, 30, 170, 100);
                
                // ランキングテーブル
                pdf.addPage();
                pdf.setFontSize(12);
                pdf.text('使用ユーザーランキング (トップ20)', 20, 20);
                
                // テーブルデータ取得
                const tbody = document.getElementById('ranking-body');
                const rows = Array.from(tbody.querySelectorAll('tr')).slice(0, 20);
                
                pdf.setFontSize(9);
                let tableY = 30;
                pdf.text('順位', 20, tableY);
                pdf.text('生徒名', 40, tableY);
                pdf.text('学籍番号', 100, tableY);
                pdf.text('使用回数', 160, tableY);
                
                tableY += 8;
                rows.forEach((row, index) => {
                    const cells = row.querySelectorAll('td');
                    const rank = (index + 1).toString();
                    const name = cells[1].textContent;
                    const id = cells[2].textContent;
                    const count = cells[3].textContent;
                    
                    pdf.text(rank, 20, tableY);
                    pdf.text(name, 40, tableY);
                    pdf.text(id, 100, tableY);
                    pdf.text(count, 160, tableY);
                    
                    tableY += 7;
                    
                    if (tableY > 270 && index < rows.length - 1) {
                        pdf.addPage();
                        tableY = 20;
                    }
                });
                
                // 保存
                pdf.save(\`wannav_usage_report_\${dayjs().format('YYYYMMDD')}.pdf\`);
            }

            // 初期化実行
            init();
        </script>
    </body>
    </html>
  `)
})

export default app
