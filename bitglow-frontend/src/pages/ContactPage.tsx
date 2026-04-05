import { LegalLayout } from "../components/landing/LegalLayout";

export default function ContactPage() {
    return (
        <LegalLayout
            title="Contact"
            description="If you need help with your account, BitGlow product questions, or general support, here is the best way to reach us."
        >
            <section>
                <h2 className="text-lg font-semibold text-white">Support email</h2>
                <p className="mt-2">
                    Reach us at{" "}
                    <a className="text-white underline underline-offset-4" href="mailto:support@bitglow.app">
                        support@bitglow.app
                    </a>
                    .
                </p>
            </section>

            <section>
                <h2 className="text-lg font-semibold text-white">What to include</h2>
                <p className="mt-2">
                    Include your username, the issue you are seeing, and any helpful
                    screenshots or reproduction steps so we can respond faster.
                </p>
            </section>
        </LegalLayout>
    );
}
