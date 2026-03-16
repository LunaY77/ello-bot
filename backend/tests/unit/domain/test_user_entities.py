from app.domain.user.entities import User, UserSettings


def test_user_profile_update_and_settings_attachment():
    user = User(
        id=1,
        username="admin",
        password_hash="hashed",
        display_name="System Admin",
    )

    user.update_profile(
        display_name="Updated Admin",
        bio="Profile only",
        timezone="Asia/Shanghai",
    )
    user.attach_settings(UserSettings(locale="zh-CN", theme="light"))

    assert user.display_name == "Updated Admin"
    assert user.bio == "Profile only"
    assert user.timezone == "Asia/Shanghai"
    assert user.settings is not None
    assert user.settings.locale == "zh-CN"
