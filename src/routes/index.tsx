import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
	return (
		<div className="p-8">
			<h1 className="text-4xl font-bold">SurveyFlow</h1>
			<p className="mt-4 text-lg">
				A production-ready foundation for survey workflows.
			</p>
		</div>
	);
}
