/**
 * WannaV Dashboard SSO認証ミドルウェア (Hono用)
 * 
 * 使い方:
 * 1. このファイルをsrc/middlewareに配置
 * 2. メインファイルで以下のようにインポート:
 *    import { ssoAuthMiddleware } from './middleware/sso-auth.js';
 * 3. すべてのルートの前にミドルウェアを追加:
 *    app.use('*', ssoAuthMiddleware);
 */

import jwt from 'jsonwebtoken';
import { getCookie, setCookie } from 'hono/cookie';

// WannaV Dashboardと同じJWT_SECRETを使用
const JWT_SECRET = process.env.JWT_SECRET || 'wannav-secret-key-change-in-production';
const DASHBOARD_URL = process.env.DASHBOARD_URL || 'https://wannav-main.onrender.com';

export async function ssoAuthMiddleware(c, next) {
  // 認証トークンをチェック
  const tokenFromQuery = c.req.query('auth_token');
  const tokenFromCookie = getCookie(c, 'wannav_sso');

  const token = tokenFromQuery || tokenFromCookie;

  // トークンがない場合はダッシュボードにリダイレクト
  if (!token) {
    console.log('❌ SSO トークンなし → ダッシュボードにリダイレクト');
    return c.redirect(DASHBOARD_URL);
  }

  try {
    // デバッグ: JWT_SECRETの確認
    console.log('🔍 JWT_SECRET exists:', !!process.env.JWT_SECRET);
    console.log('🔍 JWT_SECRET length:', process.env.JWT_SECRET ? process.env.JWT_SECRET.length : 0);
    console.log('🔍 Using secret:', JWT_SECRET.substring(0, 10) + '...');
    
    // トークンを検証
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // SSOトークンかチェック
    if (decoded.type !== 'sso') {
      console.log('❌ 無効なトークンタイプ');
      return c.redirect(DASHBOARD_URL);
    }

    console.log(`✅ SSO 認証成功: ${decoded.username} (${decoded.role})`);

    // ユーザー情報をコンテキストに追加
    c.set('user', {
      id: decoded.userId,
      username: decoded.username,
      role: decoded.role
    });

    // クエリパラメータからトークンを取得した場合、Cookieに保存してリダイレクト
    if (tokenFromQuery) {
      setCookie(c, 'wannav_sso', token, {
        httpOnly: true,
        secure: true,  // HTTPS必須（sameSite: 'None'の場合は必須）
        maxAge: 60 * 60, // 1時間（秒単位）
        sameSite: 'None', // Cross-siteアクセスを許可
        path: '/'
      });
      
      // トークンをURLから削除してリダイレクト
      const url = new URL(c.req.url);
      url.searchParams.delete('auth_token');
      console.log('🔄 Cookieに保存してリダイレクト:', url.pathname + url.search);
      return c.redirect(url.pathname + url.search);
    }

    await next();
  } catch (error) {
    console.error('❌ SSO トークン検証エラー:', error.message);
    
    // トークンが期限切れの場合、Cookieをクリア
    setCookie(c, 'wannav_sso', '', {
      maxAge: 0,
      path: '/'
    });
    
    return c.redirect(DASHBOARD_URL);
  }
}
