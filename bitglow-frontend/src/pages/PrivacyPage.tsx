import { LegalLayout } from "../components/landing/LegalLayout";

export default function PrivacyPage() {
    return (
        <LegalLayout
            title="Privacy"
            description="This page explains what BitGlow may collect, how it is used, and how to contact us about your data."
        >
            <section>
                <h2 className="text-lg font-semibold text-white">Data we collect</h2>
                <p className="mt-2">
                    BitGlow may collect account information you provide during sign up,
                    profile details you add, and technical information required to keep
                    authentication, messaging, and live sessions working reliably.
                </p>
            </section>

            <section>
                <h2 className="text-lg font-semibold text-white">Cookies and session data</h2>
                <p className="mt-2">
                    We may use cookies, local storage, and similar technologies to keep
                    you signed in, remember session state, and improve the reliability of
                    the app across devices and reconnects.
                </p>
            </section>

            <section>
                <h2 className="text-lg font-semibold text-white">How data is used</h2>
                <p className="mt-2">
                    Your information is used to operate BitGlow, secure accounts, deliver
                    product features, monitor reliability, and respond to support or
                    safety issues.
                </p>
            </section>

            <section>
                <h2 className="text-lg font-semibold text-white">Contact</h2>
                <p className="mt-2">
                    For privacy questions, contact us at{" "}
                    <a className="text-white underline underline-offset-4" href="mailto:support@bitglow.app">
                        support@bitglow.app
                    </a>
                    .
                </p>
            </section>
        </LegalLayout>
    );
}
