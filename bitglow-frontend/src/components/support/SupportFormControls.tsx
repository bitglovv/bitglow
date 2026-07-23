import React, { useRef, useState } from "react";
import { Upload, X, File, Monitor, Smartphone, Globe, CheckCircle } from "lucide-react";
import { TicketDeviceInfo } from "../../types/support";

interface FormFieldProps {
    label: string;
    required?: boolean;
    hint?: string;
    error?: string;
    children: React.ReactNode;
}

export const SupportFormField: React.FC<FormFieldProps> = ({
    label,
    required,
    hint,
    error,
    children,
}) => (
    <div className="space-y-1.5">
        <div className="flex items-center justify-between">
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400">
                {label} {required && <span className="text-rose-400">*</span>}
            </label>
            {hint && <span className="text-[11px] text-zinc-500">{hint}</span>}
        </div>
        {children}
        {error && <p className="text-xs font-semibold text-rose-400 mt-1">{error}</p>}
    </div>
);

export const SupportInput: React.FC<
    React.InputHTMLAttributes<HTMLInputElement> & { error?: string }
> = ({ error, className = "", ...props }) => (
    <input
        {...props}
        className={`w-full rounded-xl border ${
            error ? "border-rose-500/50 bg-rose-500/[0.05]" : "border-white/[0.08] bg-white/[0.04]"
        } px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none transition focus:border-emerald-500/50 focus:bg-white/[0.07] ${className}`}
    />
);

export const SupportTextarea: React.FC<
    React.TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: string }
> = ({ error, className = "", rows = 4, ...props }) => (
    <textarea
        {...props}
        rows={rows}
        className={`w-full resize-none rounded-xl border ${
            error ? "border-rose-500/50 bg-rose-500/[0.05]" : "border-white/[0.08] bg-white/[0.04]"
        } px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none transition focus:border-emerald-500/50 focus:bg-white/[0.07] ${className}`}
    />
);

export const SupportSelect: React.FC<
    React.SelectHTMLAttributes<HTMLSelectElement> & { error?: string }
> = ({ error, className = "", children, ...props }) => (
    <select
        {...props}
        className={`w-full rounded-xl border ${
            error ? "border-rose-500/50 bg-rose-500/[0.05]" : "border-white/[0.08] bg-white/[0.04]"
        } px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-500/50 focus:bg-white/[0.07] ${className}`}
    >
        {children}
    </select>
);

interface FileUploadProps {
    onFilesSelected?: (files: File[]) => void;
    maxFiles?: number;
    maxSizeMB?: number;
}

export const SupportFileUpload: React.FC<FileUploadProps> = ({
    onFilesSelected,
    maxFiles = 3,
    maxSizeMB = 5,
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [files, setFiles] = useState<File[]>([]);
    const [error, setError] = useState<string>("");

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        const selected = Array.from(e.target.files);
        setError("");

        let validFiles: File[] = [];
        for (const file of selected) {
            if (file.size > maxSizeMB * 1024 * 1024) {
                setError(`File ${file.name} exceeds maximum limit of ${maxSizeMB}MB.`);
                return;
            }
            validFiles.push(file);
        }

        const combined = [...files, ...validFiles].slice(0, maxFiles);
        setFiles(combined);
        if (onFilesSelected) onFilesSelected(combined);
    };

    const removeFile = (index: number) => {
        const updated = files.filter((_, i) => i !== index);
        setFiles(updated);
        if (onFilesSelected) onFilesSelected(updated);
    };

    return (
        <div className="space-y-3">
            <div
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-5 text-center cursor-pointer transition hover:border-emerald-500/40 hover:bg-white/[0.04]"
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,.pdf,.log,.txt"
                    onChange={handleFileChange}
                    className="hidden"
                />
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.05] text-zinc-400 mb-2">
                    <Upload className="h-5 w-5" />
                </div>
                <p className="text-xs font-semibold text-zinc-300">
                    Click or drag files here to attach screenshots or logs
                </p>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                    Images, PDFs, or TXT (Max {maxFiles} files, up to {maxSizeMB}MB each)
                </p>
            </div>

            {error && <p className="text-xs font-semibold text-rose-400">{error}</p>}

            {files.length > 0 && (
                <div className="space-y-2">
                    {files.map((file, idx) => (
                        <div
                            key={idx}
                            className="flex items-center justify-between rounded-xl border border-white/[0.07] bg-white/[0.04] px-3.5 py-2 text-xs"
                        >
                            <div className="flex items-center gap-2.5 overflow-hidden">
                                <File className="h-4 w-4 shrink-0 text-emerald-400" />
                                <span className="truncate font-medium text-white">{file.name}</span>
                                <span className="text-zinc-500 shrink-0">
                                    ({(file.size / 1024).toFixed(0)} KB)
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={() => removeFile(idx)}
                                className="text-zinc-400 hover:text-rose-400 p-1 transition"
                                aria-label="Remove File"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export const SupportDeviceBox: React.FC<{ deviceInfo: TicketDeviceInfo }> = ({ deviceInfo }) => {
    const [expanded, setExpanded] = useState(false);

    return (
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 text-xs">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-zinc-300">
                    {deviceInfo.deviceType === "Mobile" ? (
                        <Smartphone className="h-4 w-4 text-emerald-400" />
                    ) : (
                        <Monitor className="h-4 w-4 text-emerald-400" />
                    )}
                    <span>Auto-Captured Diagnostics</span>
                </div>
                <button
                    type="button"
                    onClick={() => setExpanded(!expanded)}
                    className="text-[11px] font-semibold text-emerald-400 hover:underline"
                >
                    {expanded ? "Hide details" : "View diagnostic parameters"}
                </button>
            </div>

            <p className="mt-1 text-zinc-500">
                {deviceInfo.os} · {deviceInfo.browser} ({deviceInfo.screenResolution})
            </p>

            {expanded && (
                <div className="mt-3 border-t border-white/[0.06] pt-3 space-y-1 text-zinc-400 font-mono text-[11px]">
                    <p><strong className="text-zinc-300">OS:</strong> {deviceInfo.os}</p>
                    <p><strong className="text-zinc-300">Browser:</strong> {deviceInfo.browser}</p>
                    <p><strong className="text-zinc-300">Resolution:</strong> {deviceInfo.screenResolution}</p>
                    <p><strong className="text-zinc-300">Device Category:</strong> {deviceInfo.deviceType}</p>
                    <p className="break-all"><strong className="text-zinc-300">User Agent:</strong> {deviceInfo.userAgent}</p>
                </div>
            )}
        </div>
    );
};
