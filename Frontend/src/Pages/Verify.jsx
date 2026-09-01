import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { CircleCheck, CircleX, Copy, Check, ArrowRight, HeartPulse } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { hospitalService } from '../services';
import { Card, Button, LoadingState } from '../components/ui';

const Verify = () => {
  const { token } = useParams();
  const navigate = useNavigate();

  const [status, setStatus] = useState('working');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  // React 18 StrictMode mounts effects twice in development. Without this guard
  // the verification runs twice and the second call reports "already used".
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    if (!token) {
      setError('This verification link is not valid.');
      setStatus('failed');
      return;
    }

    hospitalService
      .verify(token)
      .then((data) => {
        setResult(data);
        setStatus('done');
      })
      .catch((err) => {
        setError(err.message);
        setStatus('failed');
      });
  }, [token]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(
        `Hospital ID: ${result.hospital.tenantId}\nE-mail: ${result.adminUser.email}${
          result.adminUser.temporaryPassword
            ? `\nPassword: ${result.adminUser.temporaryPassword}`
            : ''
        }`
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-lg">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2.5">
          <span className="rounded-lg bg-cyan-600 p-1.5 text-white">
            <HeartPulse className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="text-base font-semibold text-slate-900">CareEase</span>
        </Link>

        <Card className="p-8 text-center">
          {status === 'working' && <LoadingState label="Verifying your hospital" />}

          {status === 'failed' && (
            <>
              <span className="mx-auto inline-flex rounded-full bg-red-50 p-3.5 text-red-600">
                <CircleX className="h-8 w-8" aria-hidden="true" />
              </span>
              <h1 className="mt-5 text-xl font-semibold text-slate-900">Verification failed</h1>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{error}</p>
              <div className="mt-6 flex justify-center gap-3">
                <Button variant="outline" onClick={() => navigate('/hospital-register')}>
                  Register again
                </Button>
                <Button onClick={() => navigate('/login')}>Go to sign in</Button>
              </div>
            </>
          )}

          {status === 'done' && (
            <>
              <span className="mx-auto inline-flex rounded-full bg-emerald-50 p-3.5 text-emerald-600">
                <CircleCheck className="h-8 w-8" aria-hidden="true" />
              </span>
              <h1 className="mt-5 text-xl font-semibold text-slate-900">
                {result.hospital.name} is active
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Your administrator account is ready. Sign in and change the password straight away.
              </p>

              <dl className="mt-6 space-y-2.5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-left text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Hospital ID</dt>
                  <dd className="font-mono font-semibold text-slate-900">
                    {result.hospital.tenantId}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">E-mail</dt>
                  <dd className="break-all font-medium text-slate-900">{result.adminUser.email}</dd>
                </div>
                {result.adminUser.temporaryPassword && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-500">Temporary password</dt>
                    <dd className="font-mono font-semibold text-slate-900">
                      {result.adminUser.temporaryPassword}
                    </dd>
                  </div>
                )}
              </dl>

              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Button variant="outline" icon={copied ? Check : Copy} onClick={copy}>
                  {copied ? 'Copied' : 'Copy details'}
                </Button>
                <Button onClick={() => navigate('/login')}>
                  Sign in
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Verify;
