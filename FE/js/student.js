document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('messageForm');
  const nameInput = document.getElementById('name');
  const imageInput = document.getElementById('image');
  const imageLabel = document.getElementById('imageLabel');
  const codeInput = document.getElementById('code');
  const messageInput = document.getElementById('message');
  const charCount = document.getElementById('charCount');
  const previewImage = document.getElementById('previewImage');
  const previewName = document.getElementById('previewName');
  const previewMessage = document.getElementById('previewMessage');

  // Character count
  messageInput.addEventListener('input', () => {
    charCount.textContent = messageInput.value.length;
  });

  // Live preview - name
  nameInput.addEventListener('input', () => {
    previewName.textContent = nameInput.value || '이름';
  });

  // Live preview - message
  messageInput.addEventListener('input', () => {
    previewMessage.textContent = messageInput.value || '전달할 말';
  });

  // Image preview
  let selectedFile = null;
  imageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      selectedFile = file;
      imageLabel.textContent = file.name;
      const reader = new FileReader();
      reader.onload = (ev) => {
        previewImage.src = ev.target.result;
        previewImage.classList.add('uploaded');
      };
      reader.readAsDataURL(file);
    }
  });

  // Form submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const code = codeInput.value.trim();
    const name = nameInput.value.trim();
    const message = messageInput.value.trim();

    if (!code || !name || !message) {
      alert('모든 필드를 입력해주세요.');
      return;
    }

    // Step 1: Validate code
    try {
      const validateRes = await fetch('/api/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });
      const validateData = await validateRes.json();

      if (!validateData.valid) {
        alert('올바르지 않은 개인식별번호입니다.');
        return;
      }

      if (validateData.remaining <= 0) {
        alert('최대 작성 횟수(3회)를 초과했습니다.');
        return;
      }

      // Step 2: Submit message
      const formData = new FormData();
      formData.append('name', name);
      formData.append('message', message);
      formData.append('code', code);
      if (selectedFile) {
        formData.append('image', selectedFile);
      }

      const submitRes = await fetch('/api/messages', {
        method: 'POST',
        body: formData
      });
      const submitData = await submitRes.json();

      if (submitData.success) {
        alert('메시지가 성공적으로 전달되었습니다!');
        form.reset();
        previewImage.src = 'assets/carnation.png';
        previewImage.classList.remove('uploaded');
        previewName.textContent = '이름';
        previewMessage.textContent = '전달할 말';
        charCount.textContent = '0';
        imageLabel.textContent = '이미지 선택하기';
        selectedFile = null;
      } else {
        alert(submitData.error || '전송에 실패했습니다.');
      }
    } catch (err) {
      alert('서버 오류가 발생했습니다. 다시 시도해주세요.');
      console.error(err);
    }
  });
});
