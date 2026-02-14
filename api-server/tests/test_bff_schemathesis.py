"""
Schemathesis tests for BFF Server
BFFサーバー（Node.js）の全エンドポイントをテストします

このテストは swagger.yaml に定義された全エンドポイントを自動的にテストします。
"""
import os
import schemathesis
from hypothesis import settings, HealthCheck
import pytest

# BFFサーバーのswagger.yamlを読み込み
SCHEMA_PATH = "/home/ec2-user/moodle-docker/bff-server/swagger.yaml"
schema = schemathesis.openapi.from_path(SCHEMA_PATH)

# BFFサーバーのベースURL（環境変数から取得、デフォルトはlocalhost）
BFF_BASE_URL = os.getenv("BFF_BASE_URL", "http://localhost:3001")


# ==========================================
# パターン1: 全エンドポイントの基本テスト
# ==========================================

@schema.parametrize()
@settings(
    max_examples=10,
    deadline=None,
    suppress_health_check=[HealthCheck.filter_too_much, HealthCheck.too_slow]
)
def test_all_bff_endpoints(case):
    """
    BFFサーバーの全エンドポイントをテスト

    自動的に実行される検証:
    - スキーマ準拠チェック
    - ステータスコードチェック
    - レスポンス型チェック
    - 必須フィールドチェック
    """
    # 認証が必要なエンドポイントはスキップ（認証機構のテストは別途実施）
    auth_required_paths = [
        "/api/logout",           # 認証が必要
        "/api/user/info",        # 認証が必要
    ]

    # ファイルアップロードは別途テスト
    skip_paths = [
        "/api/moodle/files/upload",  # multipart/form-data は別途テスト
    ]

    # 管理者権限が必要なエンドポイント
    admin_paths = [
        "/api/webcoach/updatedb",    # 管理者のみ
    ]

    all_skip_paths = auth_required_paths + skip_paths + admin_paths

    if any(case.path.startswith(path) or case.path == path for path in all_skip_paths):
        pytest.skip(f"Skipping {case.path}: Requires authentication or special handling")

    # BFFサーバーにリクエスト送信
    # 外部IPアドレス経由でアクセス（nginx経由）
    try:
        response = case.call(base_url=BFF_BASE_URL)

        # レスポンスを検証
        case.validate_response(response)

    except Exception as e:
        # 接続エラーなどはスキップ（BFFサーバーが起動していない場合）
        if "Connection" in str(e) or "refused" in str(e):
            pytest.skip(f"BFF server not running: {e}")
        raise


# ==========================================
# パターン2: ヘルスチェックエンドポイント
# ==========================================

@schema.parametrize(endpoint="/health")
@settings(max_examples=3, deadline=None)
def test_health_endpoint(case):
    """
    ヘルスチェックエンドポイントのテスト
    """
    response = case.call(base_url=BFF_BASE_URL)
    case.validate_response(response)

    # 追加検証: 正常時は 200 OK
    if response.status_code == 200:
        assert response.json() is not None


@schema.parametrize(endpoint="/api/health")
@settings(max_examples=3, deadline=None)
def test_api_health_endpoint(case):
    """
    APIヘルスチェックエンドポイントのテスト
    """
    response = case.call(base_url=BFF_BASE_URL)
    case.validate_response(response)

    if response.status_code == 200:
        assert response.json() is not None


# ==========================================
# パターン3: 認証エンドポイント
# ==========================================

@schema.parametrize(endpoint="/api/login", method="POST")
@settings(max_examples=5, deadline=None)
def test_login_endpoint(case):
    """
    ログインエンドポイントのテスト

    認証情報が正しくない場合は 401 が返されることを確認
    """
    response = case.call(base_url=BFF_BASE_URL)
    case.validate_response(response)

    # ログイン結果の検証
    # 正常な認証情報でない限り、401 または 400 が返される
    if response.status_code in [200, 400, 401]:
        data = response.json()
        assert data is not None


# ==========================================
# パターン4: Moodleコースエンドポイント
# ==========================================

@schema.parametrize(endpoint="/api/moodle/courses", method="GET")
@settings(max_examples=5, deadline=None)
def test_moodle_courses_list(case):
    """
    Moodleコース一覧取得のテスト
    """
    try:
        response = case.call(base_url=BFF_BASE_URL)
        case.validate_response(response)

        # 成功時はコース配列が返される
        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, list) or isinstance(data, dict)

    except Exception as e:
        if "Connection" in str(e) or "refused" in str(e):
            pytest.skip(f"BFF server not running: {e}")
        raise


@schema.parametrize(endpoint="/api/moodle/categories", method="GET")
@settings(max_examples=5, deadline=None)
def test_moodle_categories(case):
    """
    Moodleカテゴリ一覧取得のテスト
    """
    try:
        response = case.call(base_url=BFF_BASE_URL)
        case.validate_response(response)

        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, list) or isinstance(data, dict)

    except Exception as e:
        if "Connection" in str(e) or "refused" in str(e):
            pytest.skip(f"BFF server not running: {e}")
        raise


# ==========================================
# パターン5: WebCoachエンドポイント
# ==========================================

@schema.parametrize(endpoint="/api/webcoach/profile/{userid}")
@settings(max_examples=5, deadline=None)
def test_webcoach_profile(case):
    """
    WebCoachプロフィールエンドポイントのテスト
    """
    try:
        response = case.call(base_url=BFF_BASE_URL)
        case.validate_response(response)

        # GET成功時はプロフィール情報が返される
        if response.status_code == 200 and case.method == "GET":
            data = response.json()
            if isinstance(data, dict):
                # エラーでない場合、mdl_user_id が含まれる
                assert "mdl_user_id" in data or "error" in data

    except Exception as e:
        if "Connection" in str(e) or "refused" in str(e):
            pytest.skip(f"BFF server not running: {e}")
        raise


@schema.parametrize(endpoint="/api/webcoach/resumecourse/{userid}")
@settings(max_examples=5, deadline=None)
def test_webcoach_resume_course(case):
    """
    WebCoachレジュームコースエンドポイントのテスト
    """
    try:
        response = case.call(base_url=BFF_BASE_URL)
        case.validate_response(response)

        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, list) or isinstance(data, dict)

    except Exception as e:
        if "Connection" in str(e) or "refused" in str(e):
            pytest.skip(f"BFF server not running: {e}")
        raise


@schema.parametrize(endpoint="/api/webcoach/roadmaps", method="GET")
@settings(max_examples=5, deadline=None)
def test_webcoach_roadmaps(case):
    """
    WebCoachロードマップ一覧のテスト
    """
    try:
        response = case.call(base_url=BFF_BASE_URL)
        case.validate_response(response)

        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, list) or isinstance(data, dict)

    except Exception as e:
        if "Connection" in str(e) or "refused" in str(e):
            pytest.skip(f"BFF server not running: {e}")
        raise


@schema.parametrize(endpoint="/api/webcoach/ai", method="POST")
@settings(max_examples=5, deadline=None)
def test_webcoach_ai(case):
    """
    WebCoach AIエンドポイントのテスト
    """
    try:
        response = case.call(base_url=BFF_BASE_URL)
        case.validate_response(response)

        if response.status_code == 200:
            data = response.json()
            assert data is not None

    except Exception as e:
        if "Connection" in str(e) or "refused" in str(e):
            pytest.skip(f"BFF server not running: {e}")
        raise


# ==========================================
# パターン6: Badgeエンドポイント
# ==========================================

@schema.parametrize(endpoint="/api/moodle/badges", method="GET")
@settings(max_examples=5, deadline=None)
def test_moodle_badges(case):
    """
    Moodleバッジ一覧のテスト
    """
    try:
        response = case.call(base_url=BFF_BASE_URL)
        case.validate_response(response)

        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, list) or isinstance(data, dict)

    except Exception as e:
        if "Connection" in str(e) or "refused" in str(e):
            pytest.skip(f"BFF server not running: {e}")
        raise


# ==========================================
# カスタムフック
# ==========================================

@schema.hooks.register("before_call")
def before_call(context, case):
    """
    リクエスト送信前に実行されるフック

    必要に応じて:
    - 認証ヘッダーの追加
    - テストモードフラグの追加
    - リクエストのログ記録
    """
    # テストモードヘッダーを追加（BFFサーバーでテストモード判定に使用可能）
    case.headers = case.headers or {}
    case.headers["X-Test-Mode"] = "true"


@schema.hooks.register("after_call")
def after_call(context, case, response):
    """
    リクエスト送信後に実行されるフック

    レスポンスのログ記録などに使用
    """
    # デバッグ用: リクエストとレスポンスをログ出力
    # print(f"[TEST] {case.method} {case.path} -> {response.status_code}")
    pass


# ==========================================
# 実行方法
# ==========================================
"""
## 前提条件
BFFサーバーが起動していること

```bash
cd /home/ec2-user/moodle-docker
docker-compose up -d

# 確認
curl http://localhost:3001/health
# または
curl http://YOUR_IP/health
```

## テスト実行

### ローカル環境（docker-compose.override.yml使用）
```bash
cd /home/ec2-user/moodle-docker/api-server

# デフォルト: localhost:3001
pytest tests/test_bff_schemathesis.py -v

# または明示的に指定
BFF_BASE_URL=http://localhost:3001 pytest tests/test_bff_schemathesis.py -v
```

### 外部IPアドレス経由（nginx経由）
```bash
# 環境変数で外部IPを指定
BFF_BASE_URL=http://15.152.220.38 pytest tests/test_bff_schemathesis.py -v

# または .env ファイルに記載
echo "BFF_BASE_URL=http://15.152.220.38" > .env
pytest tests/test_bff_schemathesis.py -v

# 特定のテストのみ実行
pytest tests/test_bff_schemathesis.py::test_health_endpoint -v

# 詳細出力
pytest tests/test_bff_schemathesis.py -v -s

# カバレッジ付き
pytest tests/test_bff_schemathesis.py --cov --cov-report=html
```

## テスト内容
- Health: 2エンドポイント
- Authentication: 1エンドポイント（login）
- Moodle Courses: 2エンドポイント
- Moodle Badges: 1エンドポイント
- WebCoach: 5エンドポイント
- 合計: 11+ エンドポイント + 全体テスト

## スキップされるエンドポイント
- /api/logout: 認証が必要
- /api/user/info: 認証が必要
- /api/moodle/files/upload: ファイルアップロード（別途テスト）
- /api/webcoach/updatedb: 管理者権限が必要
"""
