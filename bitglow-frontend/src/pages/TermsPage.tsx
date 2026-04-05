import { LegalLayout } from "../components/landing/LegalLayout";

export default function TermsPage() {
    return (
        <LegalLayout
            title="Terms"
            description="These terms outline the basic rules for using BitGlow, including accounts, acceptable use, and service limitations."
        >
            <section>
                <h2 className="text-lg font-semibold text-white">Account rules</h2>
                <p className="mt-2">
                    You are responsible for keeping your account credentials secure and
                    for activity that happens under your account.
                </p>
            </section>

            <section>
                <h2 className="text-lg font-semibold text-white">Acceptable use</h2>
                <p className="mt-2">
                    You agree not to misuse BitGlow, interfere with the service, attempt
                    unauthorized access, or use the platform for harmful, abusive, or
                    unlawful activity.
                </p>
            </section>

            <section>
                <h2 className="text-lg font-semibold text-white">Liability</h2>
                <p className="mt-2">
                    BitGlow is provided on an as-available basis. We aim to keep the
                    service reliable, but uptime, availability, and data continuity are
                    not guaranteed in every circumstance.
                </p>
            </section>

            <section>
                <h2 className="text-lg font-semibold text-white">Termination</h2>
                <p className="mt-2">
                    We may suspend or terminate access when accounts violate these terms,
                    create security risks, or harm the service or other users.
                </p>
            </section>
        </LegalLayout>
    );
}
