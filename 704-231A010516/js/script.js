/* ============================================
   script.js - Main JavaScript for all exercises
   ============================================ */

// =============================================
// NAVBAR TOGGLE (Mobile)
// =============================================
document.addEventListener('DOMContentLoaded', () => {
  const navToggle = document.querySelector('.nav-toggle');
  const navLinks = document.querySelector('.nav-links');

  if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
      navLinks.classList.toggle('open');
    });

    // Close menu when clicking a link
    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('open');
      });
    });
  }
});

// =============================================
// BAI TAP 01 - IMAGE CAROUSEL
// =============================================
/*
  LOGIC TU DUY - XU LY INDEX:

  1. Index wrapping (tránh ngoài giới hạn):
     - Sử dụng phép toán modulo: index = (index + totalSlides) % totalSlides
     - Khi nhấn "Next": (currentIndex + 1) % totalSlides
       → Khi index = 5 (cuối) → (5+1) % 6 = 0 → quay lại đầu
     - Khi nhấn "Prev": (currentIndex - 1 + totalSlides) % totalSlides
       → Khi index = 0 (đầu) → (0-1+6) % 6 = 5 → quay lại cuối
     - Cách này luôn đảm bảo index nằm trong [0, totalSlides-1]

  2. Tối ưu performance:
     - Sử dụng CSS transform: translateX() thay vì thay đổi left/margin
       → Transform được GPU tăng tốc, không gây layout/paint lại
     - Sử dụng will-change: transform để browser chuẩn bị trước
     - CSS transition thay vì JavaScript animation → mượt hơn
     - Sử dụng requestAnimationFrame không cần thiết vì CSS transition đã xử lý
     - Auto-play dùng setInterval, pause khi hover để tiết kiệm CPU
*/

function initCarousel() {
  const track = document.querySelector('.carousel-track');
  if (!track) return;

  const slides = track.querySelectorAll('.slide');
  const totalSlides = slides.length;
  const prevBtn = document.querySelector('.carousel-btn.prev');
  const nextBtn = document.querySelector('.carousel-btn.next');
  const dotsContainer = document.querySelector('.carousel-dots');

  let currentIndex = 0;
  let autoPlayInterval = null;

  // Tạo dots indicator
  slides.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.classList.add('dot');
    if (i === 0) dot.classList.add('active');
    dot.setAttribute('aria-label', `Slide ${i + 1}`);
    dot.addEventListener('click', () => goToSlide(i));
    dotsContainer.appendChild(dot);
  });

  const dots = dotsContainer.querySelectorAll('.dot');

  // Di chuyển đến slide chỉ định
  function goToSlide(index) {
    // Xử lý index wrapping bằng modulo
    currentIndex = ((index % totalSlides) + totalSlides) % totalSlides;

    // Dùng transform translateX - GPU accelerated
    track.style.transform = `translateX(-${currentIndex * 100}%)`;

    // Cập nhật dots
    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === currentIndex);
    });
  }

  // Đi tới slide tiếp theo
  function nextSlide() {
    goToSlide(currentIndex + 1);
  }

  // Quay lại slide trước
  function prevSlide() {
    goToSlide(currentIndex - 1);
  }

  // Auto-play: tự động chuyển slide mỗi 3 giây
  function startAutoPlay() {
    stopAutoPlay();
    autoPlayInterval = setInterval(nextSlide, 3000);
  }

  function stopAutoPlay() {
    if (autoPlayInterval) {
      clearInterval(autoPlayInterval);
      autoPlayInterval = null;
    }
  }

  // Event listeners
  prevBtn.addEventListener('click', () => {
    prevSlide();
    startAutoPlay(); // Reset timer khi user tương tác
  });

  nextBtn.addEventListener('click', () => {
    nextSlide();
    startAutoPlay();
  });

  // Pause auto-play khi hover (tối ưu performance & UX)
  const wrapper = document.querySelector('.carousel-wrapper');
  wrapper.addEventListener('mouseenter', stopAutoPlay);
  wrapper.addEventListener('mouseleave', startAutoPlay);

  // Hỗ trợ swipe trên mobile
  let touchStartX = 0;
  let touchEndX = 0;

  wrapper.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
    stopAutoPlay();
  }, { passive: true });

  wrapper.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    const diff = touchStartX - touchEndX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) nextSlide();
      else prevSlide();
    }
    startAutoPlay();
  }, { passive: true });

  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { prevSlide(); startAutoPlay(); }
    if (e.key === 'ArrowRight') { nextSlide(); startAutoPlay(); }
  });

  // Bắt đầu auto-play
  startAutoPlay();
}

// =============================================
// BAI TAP 02 - TODO LIST
// =============================================
/*
  LOGIC TU DUY - XU LY MANG STATE & RENDER DOM:

  1. State management (Quản lý mảng state):
     - Toàn bộ dữ liệu todos lưu trong mảng JavaScript: [{id, text, completed}, ...]
     - Mỗi todo có id duy nhất (timestamp) để xác định chính xác item
     - Mọi thao tác (thêm/xóa/sửa/toggle) đều thay đổi mảng state trước
     - Sau khi state thay đổi → lưu LocalStorage → render lại DOM
     - Luồng: User Action → Update State Array → Save to LocalStorage → Re-render DOM

  2. Render DOM hiệu quả:
     - Sử dụng innerHTML để render lại toàn bộ list (đơn giản, phù hợp kích thước nhỏ-trung bình)
     - Với danh sách lớn, có thể dùng DocumentFragment hoặc virtual DOM
     - Filter (All/Active/Completed) không thay đổi state, chỉ lọc mảng khi render
     - Event delegation: gắn event listener vào container cha thay vì từng item
       → Giảm số lượng event listeners, tốt cho performance

  3. LocalStorage:
     - Serialize mảng thành JSON trước khi lưu: JSON.stringify(todos)
     - Deserialize khi load: JSON.parse(localStorage.getItem('todos'))
     - Xử lý trường hợp lần đầu (dữ liệu null) bằng toán tử || []
*/

function initTodoApp() {
  const todoInput = document.getElementById('todo-input');
  if (!todoInput) return;

  const addBtn = document.getElementById('todo-add-btn');
  const todoList = document.getElementById('todo-list');
  const filterBtns = document.querySelectorAll('.todo-filters button');

  // Load state từ LocalStorage
  let todos = JSON.parse(localStorage.getItem('todos')) || [];
  let currentFilter = 'all';
  let editingId = null;

  // Lưu state vào LocalStorage
  function saveTodos() {
    localStorage.setItem('todos', JSON.stringify(todos));
  }

  // Render danh sách todo
  function renderTodos() {
    // Lọc theo filter hiện tại
    const filtered = todos.filter(todo => {
      if (currentFilter === 'active') return !todo.completed;
      if (currentFilter === 'completed') return todo.completed;
      return true;
    });

    if (filtered.length === 0) {
      todoList.innerHTML = `<div class="todo-empty">
        ${currentFilter === 'all' ? 'Chưa có công việc nào. Thêm công việc mới!' :
          currentFilter === 'active' ? 'Không có công việc đang thực hiện.' :
          'Chưa hoàn thành công việc nào.'}
      </div>`;
      return;
    }

    todoList.innerHTML = filtered.map(todo => `
      <div class="todo-item ${todo.completed ? 'completed' : ''}" data-id="${todo.id}">
        <input type="checkbox" class="todo-checkbox" ${todo.completed ? 'checked' : ''}>
        ${editingId === todo.id
          ? `<input type="text" class="todo-edit-input" value="${todo.text.replace(/"/g, '&quot;')}">`
          : `<span class="todo-text">${escapeHtml(todo.text)}</span>`
        }
        ${editingId === todo.id
          ? `<button class="todo-btn save" title="Lưu">&#10003;</button>`
          : `<button class="todo-btn edit" title="Sửa">&#9998;</button>`
        }
        <button class="todo-btn delete" title="Xóa">&#10005;</button>
      </div>
    `).join('');
  }

  // Escape HTML để tránh XSS
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Thêm todo mới
  function addTodo() {
    const text = todoInput.value.trim();
    if (!text) return;

    todos.push({
      id: Date.now(),
      text: text,
      completed: false
    });

    todoInput.value = '';
    saveTodos();
    renderTodos();
    todoInput.focus();
  }

  // Event: Thêm todo
  addBtn.addEventListener('click', addTodo);
  todoInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addTodo();
  });

  // Event delegation cho todo list
  todoList.addEventListener('click', (e) => {
    const item = e.target.closest('.todo-item');
    if (!item) return;
    const id = parseInt(item.dataset.id);

    // Toggle completed
    if (e.target.classList.contains('todo-checkbox')) {
      const todo = todos.find(t => t.id === id);
      if (todo) {
        todo.completed = !todo.completed;
        saveTodos();
        renderTodos();
      }
    }

    // Xóa todo
    if (e.target.classList.contains('delete')) {
      todos = todos.filter(t => t.id !== id);
      saveTodos();
      renderTodos();
    }

    // Chỉnh sửa todo
    if (e.target.classList.contains('edit')) {
      editingId = id;
      renderTodos();
      const editInput = item.querySelector('.todo-edit-input');
      if (editInput) editInput.focus();
    }

    // Lưu chỉnh sửa
    if (e.target.classList.contains('save')) {
      const editInput = item.querySelector('.todo-edit-input');
      if (editInput) {
        const newText = editInput.value.trim();
        if (newText) {
          const todo = todos.find(t => t.id === id);
          if (todo) todo.text = newText;
          saveTodos();
        }
        editingId = null;
        renderTodos();
      }
    }
  });

  // Lưu khi nhấn Enter trong ô edit
  todoList.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && e.target.classList.contains('todo-edit-input')) {
      const item = e.target.closest('.todo-item');
      if (item) {
        const id = parseInt(item.dataset.id);
        const newText = e.target.value.trim();
        if (newText) {
          const todo = todos.find(t => t.id === id);
          if (todo) todo.text = newText;
          saveTodos();
        }
        editingId = null;
        renderTodos();
      }
    }
  });

  // Filter buttons
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      currentFilter = btn.dataset.filter;
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderTodos();
    });
  });

  // Render ban đầu
  renderTodos();
}

// =============================================
// BAI TAP 03 - NUMBER GUESSING GAME
// =============================================
/*
  LOGIC TU DUY:

  1. Tạo số ngẫu nhiên:
     - Sử dụng Math.random() → trả về số thực trong [0, 1)
     - Math.random() * 100 → số thực trong [0, 100)
     - Math.floor() → làm tròn xuống → số nguyên trong [0, 99]
     - +1 → số nguyên trong [1, 100]
     - Công thức: Math.floor(Math.random() * 100) + 1

  2. Xử lý nhập để tránh lỗi:
     - parseInt() chuyển string thành số nguyên
     - Kiểm tra isNaN() → báo lỗi nếu không phải số
     - Kiểm tra phạm vi: num < 1 hoặc num > 100 → báo lỗi
     - Kiểm tra số đã đoán trước đó → tránh đoán lặp
     - Disable input khi game kết thúc → tránh thao tác thừa

  3. So sánh logic đơn giản:
     - if (guess > target) → "Quá cao!"
     - if (guess < target) → "Quá thấp!"
     - if (guess === target) → "Chính xác!" + hiệu ứng pháo hoa

  4. Pháo hoa CSS:
     - Tạo nhiều particle (div nhỏ) tại vị trí ngẫu nhiên
     - Mỗi particle có CSS custom property (--dx, --dy) cho hướng bay
     - CSS @keyframes animation di chuyển particle theo hướng đó
     - Tự động xóa DOM sau khi animation kết thúc (performance)
*/

function initGuessingGame() {
  const guessInput = document.getElementById('guess-input');
  if (!guessInput) return;

  const guessBtn = document.getElementById('guess-btn');
  const messageEl = document.getElementById('game-message');
  const attemptsEl = document.getElementById('attempts-count');
  const historyEl = document.getElementById('guess-history');
  const restartBtn = document.getElementById('restart-btn');

  let targetNumber;
  let attempts;
  let guessedNumbers;
  let gameOver;

  // Khởi tạo game mới
  function initGame() {
    // Tạo số ngẫu nhiên 1-100
    targetNumber = Math.floor(Math.random() * 100) + 1;
    attempts = 0;
    guessedNumbers = [];
    gameOver = false;

    messageEl.textContent = 'Hãy đoán một số từ 1 đến 100!';
    messageEl.className = 'game-message';
    attemptsEl.textContent = '0';
    historyEl.innerHTML = '';
    guessInput.value = '';
    guessInput.disabled = false;
    guessBtn.disabled = false;
    restartBtn.style.display = 'none';
    guessInput.focus();
  }

  // Xử lý đoán số
  function makeGuess() {
    if (gameOver) return;

    const value = guessInput.value.trim();

    // Kiểm tra input rỗng
    if (value === '') {
      messageEl.textContent = 'Vui lòng nhập một số!';
      messageEl.className = 'game-message';
      return;
    }

    const guess = parseInt(value, 10);

    // Kiểm tra có phải số hợp lệ
    if (isNaN(guess)) {
      messageEl.textContent = 'Vui lòng nhập một số hợp lệ!';
      messageEl.className = 'game-message';
      guessInput.value = '';
      return;
    }

    // Kiểm tra phạm vi
    if (guess < 1 || guess > 100) {
      messageEl.textContent = 'Số phải nằm trong khoảng 1-100!';
      messageEl.className = 'game-message';
      guessInput.value = '';
      return;
    }

    // Kiểm tra số đã đoán
    if (guessedNumbers.includes(guess)) {
      messageEl.textContent = `Bạn đã đoán số ${guess} rồi! Thử số khác.`;
      messageEl.className = 'game-message';
      guessInput.value = '';
      return;
    }

    attempts++;
    guessedNumbers.push(guess);
    attemptsEl.textContent = attempts;
    guessInput.value = '';

    let result;
    if (guess > targetNumber) {
      messageEl.textContent = `${guess} - Quá cao! Thử số nhỏ hơn.`;
      messageEl.className = 'game-message high';
      result = 'high';
    } else if (guess < targetNumber) {
      messageEl.textContent = `${guess} - Quá thấp! Thử số lớn hơn.`;
      messageEl.className = 'game-message low';
      result = 'low';
    } else {
      messageEl.textContent = `Chính xác! Số cần tìm là ${targetNumber}. Bạn đoán trong ${attempts} lần!`;
      messageEl.className = 'game-message correct';
      result = 'correct';
      gameOver = true;
      guessInput.disabled = true;
      guessBtn.disabled = true;
      restartBtn.style.display = 'inline-block';

      // Hiệu ứng pháo hoa
      launchFireworks();
    }

    // Thêm vào lịch sử
    const tag = document.createElement('span');
    tag.className = `guess-tag ${result}`;
    tag.textContent = guess;
    historyEl.appendChild(tag);

    guessInput.focus();
  }

  // Tạo hiệu ứng pháo hoa bằng CSS
  function launchFireworks() {
    const container = document.createElement('div');
    container.className = 'fireworks-container';
    document.body.appendChild(container);

    const colors = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#ec4899', '#14b8a6'];

    // Tạo 5 đợt pháo hoa
    for (let burst = 0; burst < 5; burst++) {
      setTimeout(() => {
        const cx = Math.random() * window.innerWidth;
        const cy = Math.random() * window.innerHeight * 0.6 + 50;

        // Mỗi đợt có 30 particle
        for (let i = 0; i < 30; i++) {
          const spark = document.createElement('div');
          spark.className = 'firework-spark';

          const angle = (Math.PI * 2 / 30) * i;
          const velocity = 80 + Math.random() * 120;
          const dx = Math.cos(angle) * velocity;
          const dy = Math.sin(angle) * velocity;

          spark.style.left = cx + 'px';
          spark.style.top = cy + 'px';
          spark.style.setProperty('--dx', dx + 'px');
          spark.style.setProperty('--dy', dy + 'px');
          spark.style.background = colors[Math.floor(Math.random() * colors.length)];
          spark.style.animationDelay = (Math.random() * 0.2) + 's';

          container.appendChild(spark);
        }
      }, burst * 300);
    }

    // Xóa container sau khi animation kết thúc (tối ưu DOM)
    setTimeout(() => {
      container.remove();
    }, 3000);
  }

  // Event listeners
  guessBtn.addEventListener('click', makeGuess);
  guessInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') makeGuess();
  });
  restartBtn.addEventListener('click', initGame);

  // Khởi tạo game
  initGame();
}

// =============================================
// CONTACT FORM
// =============================================
function initContactForm() {
  const form = document.getElementById('contact-form');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    alert('Cảm ơn bạn đã gửi tin nhắn! Chúng tôi sẽ phản hồi sớm.');
    form.reset();
  });
}

// =============================================
// INITIALIZE ALL
// =============================================
document.addEventListener('DOMContentLoaded', () => {
  initCarousel();
  initTodoApp();
  initGuessingGame();
  initContactForm();
});
