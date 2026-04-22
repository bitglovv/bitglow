import { useEffect, useState, ChangeEvent, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/common/Header";
import { useAuth } from "../hooks/useAuth";
import { api } from "../services/api";
import { User, MapPin, Globe, Check, Save, AtSign, ArrowLeft, Camera, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import clsx from "clsx";

export default function EditProfilePage() {
    useEffect(() => { document.title = "BitGlow \u2022 Edit Profile"; }, []);
    const { user, refreshUser } = useAuth();
    const navigate = useNavigate();

    const [form, setForm] = useState({
        displayName: user?.displayName || "",
        username: user?.username || "",
        bio: user?.bio || "",
        website: user?.website || "",
        location: user?.location || "",
        avatarUrl: user?.avatarUrl || "",
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<"success" | "error" | "">("");
    const [submitError, setSubmitError] = useState<string>("");
    const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "unavailable" | "invalid">("idle");

    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        if (name === "username") {
            const sanitized = value.toLowerCase().replace(/[^a-z0-9._]/g, "");
            setForm({ ...form, username: sanitized });

            if (!sanitized.length) {
                setUsernameStatus("idle");
                return;
            }
            if (user && sanitized === (user.username || "").toLowerCase()) {
                setUsernameStatus("available");
                return;
            }
            if (sanitized.length >= 3) {
                setUsernameStatus("checking");
                api.user
                    .checkUsername(sanitized)
                    .then((res) => setUsernameStatus(res.available ? "available" : "unavailable"))
                    .catch(() => setUsernameStatus("unavailable"));
            } else {
                setUsernameStatus("invalid");
            }
        } else {
            setForm({ ...form, [name]: value });
        }
    };

    const handleAvatar = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement("canvas");
                let { width, height } = img;
                const MAX_SIZE = 500;

                if (width > height) {
                    if (width > MAX_SIZE) {
                        height = Math.round((height *= MAX_SIZE / width));
                        width = MAX_SIZE;
                    }
                } else {
                    if (height > MAX_SIZE) {
                        width = Math.round((width *= MAX_SIZE / height));
                        height = MAX_SIZE;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext("2d");
                if (ctx) {
                    ctx.drawImage(img, 0, 0, width, height);
                    const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.8);
                    setForm((f) => ({ ...f, avatarUrl: compressedDataUrl }));
                } else {
                    // Fallback to raw string if canvas fails
                    setForm((f) => ({ ...f, avatarUrl: event.target?.result as string }));
                }
            };
            img.src = event.target?.result as string;
        };
        reader.readAsDataURL(file);
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage("");
        setSubmitError("");
        try {
            if (!form.username || form.username.length < 3 || usernameStatus === "invalid") {
                setUsernameStatus("invalid");
                setLoading(false);
                setSubmitError("Username is unavailable or invalid.");
                return;
            }
            if (usernameStatus === "unavailable") {
                setLoading(false);
                setSubmitError("Username is unavailable or invalid.");
                return;
            }
            const updated = await api.user.update(form);
            await refreshUser();
            setMessage("success");
            navigate(`/profile/${updated?.username || form.username || user?.username || ""}`);
        } catch (err: any) {
            const msg = err?.message || "Update failed";
            setMessage("error");
            setSubmitError(msg);
            if (msg.toLowerCase().includes("username")) {
                setUsernameStatus("unavailable");
            }
            return;
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#050505] text-white flex flex-col selection:bg-brand/30">
            <Header showTop={false} />

            <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 pt-6 pb-12 relative">
                {message && (
                    <Card
                        variant="glass"
                        padding="sm"
                        className={clsx(
                            "mb-6 animate-in fade-in slide-in-from-top-2 transition-all shadow-xl",
                            message === "success" ? "bg-brand/5" : "bg-red-500/5"
                        )}
                    >
                        <div className="flex items-center gap-3">
                            <div
                                className={clsx(
                                    "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                                    message === "success" ? "bg-brand/10 text-brand" : "bg-red-500/10 text-red-400"
                                )}
                            >
                                {message === "success" ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                            </div>
                            <span
                                className={clsx(
                                    "text-sm font-semibold",
                                    message === "success" ? "text-brand" : "text-red-400"
                                )}
                            >
                                {message === "success" ? "Profile successfully updated!" : "Failed to update profile. Please try again."}
                            </span>
                        </div>
                    </Card>
                )}

                <form onSubmit={handleSubmit} className="space-y-10">
                    <div className="flex items-center justify-between mb-4 -mt-2 -ml-1">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => window.history.back()}
                            className="bg-transparent border-0 px-3 h-12 shadow-none hover:bg-white/5"
                        >
                            <ArrowLeft className="w-6 h-6" />
                        </Button>
                    </div>

                    <div className="space-y-8 bg-transparent">
                        <div className="flex flex-col items-center gap-3">
                            <div className="relative">
                                <div className="w-28 h-28 rounded-full overflow-hidden bg-white/5 flex items-center justify-center">
                                    {form.avatarUrl ? (
                                        <img src={form.avatarUrl} alt="avatar preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <User className="w-8 h-8 text-zinc-500" />
                                    )}
                                </div>
                                <label className="absolute inset-0 flex items-center justify-center rounded-full cursor-pointer">
                                    <Camera className="w-6 h-6 text-white drop-shadow" />
                                    <input type="file" accept="image/*" className="hidden" onChange={handleAvatar} />
                                </label>
                            </div>
                            <p className="text-xs text-zinc-500">Change your profile picture</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <Input
                                label="Username"
                                name="username"
                                value={form.username}
                                onChange={handleChange}
                                leftIcon={<AtSign className="w-4 h-4" />}
                                placeholder="Username"
                                autoComplete="off"
                                className="bg-white/[0.03] border-0 focus:ring-1 focus:ring-brand/50"
                                helperText={
                                    usernameStatus === "checking"
                                        ? "Checking availability..."
                                        : usernameStatus === "unavailable"
                                            ? "Username already exists"
                                            : usernameStatus === "available"
                                                ? "Username available"
                                                : usernameStatus === "invalid"
                                                    ? "Use 3-30 chars: a-z 0-9 . _"
                                                    : ""
                                }
                                rightIcon={
                                    usernameStatus === "available" ? (
                                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                                    ) : usernameStatus === "unavailable" || usernameStatus === "invalid" ? (
                                        <XCircle className="w-5 h-5 text-rose-400" />
                                    ) : undefined
                                }
                                error={usernameStatus === "unavailable" || usernameStatus === "invalid" ? " " : undefined}
                            />
                            <Input
                                label="Display Name"
                                name="displayName"
                                value={form.displayName}
                                onChange={handleChange}
                                leftIcon={<User className="w-4 h-4" />}
                                placeholder="Name"
                            />
                        </div>

                        <Input
                            label="Location"
                            name="location"
                            value={form.location}
                            onChange={handleChange}
                            leftIcon={<MapPin className="w-4 h-4" />}
                            placeholder="e.g. Earth / Edge"
                        />

                        <Input
                            label="Website"
                            name="website"
                            value={form.website}
                            onChange={handleChange}
                            leftIcon={<Globe className="w-4 h-4" />}
                            placeholder="e.g. bitglow.online"
                        />

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-zinc-400 ml-1">Bio</label>
                            <textarea
                                name="bio"
                                value={form.bio}
                                onChange={handleChange}
                                rows={5}
                                placeholder="Tell us about yourself"
                                className="w-full bg-white/[0.03] border-0 rounded-2xl px-4 py-4 text-sm transition-all focus:outline-none focus:ring-1 focus:ring-brand/50 focus:bg-white/[0.05] resize-none"
                            />
                            <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 mt-2 px-1 text-right">
                                {form.bio.length} / 160 units
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 pt-4">
                        <Button
                            type="submit"
                            isLoading={loading}
                            className="flex-1 h-14"
                            disabled={usernameStatus === "unavailable" || usernameStatus === "invalid" || !form.username.trim()}
                        >
                            Save Changes
                        </Button>
                        <Button
                            variant="secondary"
                            onClick={() => window.history.back()}
                            className="bg-white/5 border-white/5 h-14 px-10"
                        >
                            Cancel
                        </Button>
                    </div>
                    {submitError && <p className="text-sm text-rose-400">{submitError}</p>}
                </form>
            </main>
        </div>
    );
}
