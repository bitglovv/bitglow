<?php
// profile.php

session_start();

// TEMP: replace with real auth later
$user = [
    'id' => 1,
    'username' => 'bitglow',
    'display_name' => 'BitGlow',
    'email' => 'u***@gmail.com',
    'status' => 'online',
    'joined' => '2026-01-01',
    'messages' => 128,
    'rooms' => 3
];

function e($str) {
    return htmlspecialchars($str, ENT_QUOTES, 'UTF-8');
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>BitGlow - Profile</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />

<style>
:root {
  --bg: #0b0e14;
  --card: #141824;
  --text: #e6e6eb;
  --muted: #8b8f9c;
  --accent: #00ffd5;
}

* { box-sizing: border-box; }

body {
  margin: 0;
  font-family: Inter, system-ui, sans-serif;
  background: var(--bg);
  color: var(--text);
}

.container {
  max-width: 420px;
  margin: auto;
  padding: 16px;
}

.card {
  background: var(--card);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 14px;
}

.header {
  display: flex;
  gap: 12px;
  align-items: center;
}

.avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: #222;
}

.name {
  font-size: 18px;
  font-weight: 600;
}

.username {
  color: var(--muted);
  font-size: 14px;
}

.status {
  color: var(--accent);
  font-size: 12px;
}

.stats {
  display: flex;
  justify-content: space-between;
}

.stat {
  text-align: center;
}

.stat strong {
  display: block;
  font-size: 18px;
}

.btn {
  width: 100%;
  padding: 10px;
  background: transparent;
  border: 1px solid var(--accent);
  color: var(--accent);
  border-radius: 8px;
  cursor: pointer;
}
</style>
</head>

<body>
<div class="container">

  <!-- PROFILE HEADER -->
  <div class="card header">
    <div class="avatar"></div>
    <div>
      <div class="name"><?php echo e($user['display_name']); ?></div>
      <div class="username">@<?php echo e($user['username']); ?></div>
      <div class="status">&bull; <?php echo e($user['status']); ?></div>
    </div>
  </div>

  <!-- ABOUT -->
  <div class="card">
    <strong>Account</strong><br><br>
    Email: <?php echo e($user['email']); ?><br>
    Joined: <?php echo e($user['joined']); ?>
  </div>

  <!-- STATS -->
  <div class="card stats">
    <div class="stat">
      <strong><?php echo (int) $user['messages']; ?></strong>
      Messages
    </div>
    <div class="stat">
      <strong><?php echo (int) $user['rooms']; ?></strong>
      Rooms
    </div>
  </div>

  <!-- ACTIONS -->
  <div class="card">
    <button class="btn">Edit Profile</button>
    <br><br>
    <button class="btn">Logout</button>
  </div>

</div>
</body>
</html>
