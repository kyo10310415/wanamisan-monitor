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

// CSV パーサー
function parseCSV(csvText: string) {
  const lines = csvText.split('\n')
  const headers = lines[0].split(',').map(h => h.trim())
  const data = []
  
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue
    
    const values = parseCSVLine(lines[i])
    const row: any = {}
    
    headers.forEach((header, index) => {
      row[header] = values[index] || ''
    })
    
    data.push(row)
  }
  
  return data
}

// CSV行をパース（カンマやクォートを考慮）
function parseCSVLine(line: string): string[] {
  const values: string[] = []
  let currentValue = ''
  let insideQuotes = false
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    
    if (char === '"') {
      insideQuotes = !insideQuotes
    } else if (char === ',' && !insideQuotes) {
      values.push(currentValue.trim())
      currentValue = ''
    } else {
      currentValue += char
    }
  }
  
  values.push(currentValue.trim())
  return values
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
                            <p class="text-purple-100 mt-2">VTuber育成スクールのチャットボット使用状況を可視化</p>
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
                    <h2 class="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <i class="fas fa-trophy text-yellow-500"></i>
                        使用ユーザーランキング
                    </h2>
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

            // ランキング更新
            function updateRanking() {
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
                
                // 降順ソート
                const sortedUsers = Object.values(userCounts).sort((a, b) => b.count - a.count);
                
                // テーブル生成
                const tbody = document.getElementById('ranking-body');
                tbody.innerHTML = '';
                
                sortedUsers.forEach((user, index) => {
                    const tr = document.createElement('tr');
                    tr.className = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';
                    
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
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">\${user.name}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">\${user.id}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-bold">\${user.count.toLocaleString()}</td>
                    \`;
                    tbody.appendChild(tr);
                });
            }

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
