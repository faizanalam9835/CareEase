import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { UserCog, Save, KeyRound, Eye, EyeOff, ShieldCheck, Building2, Mail, Phone } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services';
import { session } from '../../services/api';
import {
  Card,
  CardHeader,
  Button,
  Input,
  Badge,
  Avatar,
  PageHeader
} from '../../components/ui';
import { formatDateTime, ROLE_TONE } from '../../lib/format';
import { ROLE_LABELS } from '../../lib/navigation';

const Profile = () => {
  const { user, refreshUser } = useAuth();

  const [details, setDetails] = useState({
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    phone: user.phone || '',
    professionalEmail: user.professionalEmail || '',
    designation: user.designation || '',
    specialization: user.specialization || ''
  });
  const [savingDetails, setSavingDetails] = useState(false);

  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState({});

  const saveDetails = async (event) => {
    event.preventDefault();
    setSavingDetails(true);
    try {
      const result = await authService.updateProfile(details);
      session.updateUser(result.user);
      await refreshUser();
      toast.success('Profile updated');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSavingDetails(false);
    }
  };

  const savePassword = async (event) => {
    event.preventDefault();

    const errors = {};
    if (!passwords.currentPassword) errors.currentPassword = 'Enter your current password';
    if (passwords.newPassword.length < 8) {
      errors.newPassword = 'At least 8 characters';
    } else if (
      !/[A-Z]/.test(passwords.newPassword) ||
      !/[a-z]/.test(passwords.newPassword) ||
      !/[0-9]/.test(passwords.newPassword)
    ) {
      errors.newPassword = 'Include an uppercase letter, a lowercase letter and a number';
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      errors.confirmPassword = 'The two passwords do not match';
    }

    setPasswordErrors(errors);
    if (Object.keys(errors).length) return;

    setSavingPassword(true);
    try {
      await authService.changePassword({
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword
      });
      toast.success('Password changed');
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
      await refreshUser();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSavingPassword(false);
    }
  };

  const isDoctor = user.roles?.includes('DOCTOR');

  return (
    <>
      <PageHeader title="My account" subtitle="Your details and password" icon={UserCog} />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <div className="flex flex-col items-center p-6 text-center">
            <Avatar name={`${user.firstName} ${user.lastName}`} size="lg" />
            <h2 className="mt-4 text-lg font-semibold text-slate-900">
              {user.firstName} {user.lastName}
            </h2>
            <p className="text-sm text-slate-500">{user.designation || user.department}</p>

            <div className="mt-3 flex flex-wrap justify-center gap-1.5">
              {user.roles?.map((role) => (
                <Badge key={role} tone={ROLE_TONE[role] || 'slate'}>
                  {ROLE_LABELS[role] || role}
                </Badge>
              ))}
            </div>
          </div>

          <dl className="space-y-3 border-t border-slate-100 p-5 text-sm">
            <div className="flex items-start gap-2.5">
              <Mail className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
              <div className="min-w-0">
                <dt className="text-xs text-slate-400">Sign-in e-mail</dt>
                <dd className="break-all text-slate-800">{user.email}</dd>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Phone className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
              <div>
                <dt className="text-xs text-slate-400">Phone</dt>
                <dd className="text-slate-800">{user.phone}</dd>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
              <div>
                <dt className="text-xs text-slate-400">Hospital</dt>
                <dd className="text-slate-800">{user.hospitalName}</dd>
                <dd className="font-mono text-xs text-slate-400">{user.tenantId}</dd>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
              <div>
                <dt className="text-xs text-slate-400">Department</dt>
                <dd className="text-slate-800">{user.department}</dd>
              </div>
            </div>
            {user.lastLoginAt && (
              <p className="border-t border-slate-100 pt-3 text-xs text-slate-400">
                Last signed in {formatDateTime(user.lastLoginAt)}
              </p>
            )}
          </dl>
        </Card>

        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title="Your details" subtitle="Visible to your colleagues" icon={UserCog} />
            <form onSubmit={saveDetails} className="space-y-4 p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="First name"
                  value={details.firstName}
                  onChange={(e) => setDetails((d) => ({ ...d, firstName: e.target.value }))}
                />
                <Input
                  label="Last name"
                  value={details.lastName}
                  onChange={(e) => setDetails((d) => ({ ...d, lastName: e.target.value }))}
                />
                <Input
                  label="Phone"
                  value={details.phone}
                  onChange={(e) => setDetails((d) => ({ ...d, phone: e.target.value }))}
                />
                <Input
                  label="Contact e-mail"
                  type="email"
                  value={details.professionalEmail}
                  onChange={(e) => setDetails((d) => ({ ...d, professionalEmail: e.target.value }))}
                />
                <Input
                  label="Designation"
                  value={details.designation}
                  onChange={(e) => setDetails((d) => ({ ...d, designation: e.target.value }))}
                />
                {isDoctor && (
                  <Input
                    label="Specialization"
                    value={details.specialization}
                    onChange={(e) => setDetails((d) => ({ ...d, specialization: e.target.value }))}
                  />
                )}
              </div>

              <p className="text-xs text-slate-500">
                Your role and department are set by a hospital administrator.
              </p>

              <div className="flex justify-end">
                <Button type="submit" icon={Save} loading={savingDetails}>
                  Save changes
                </Button>
              </div>
            </form>
          </Card>

          <Card>
            <CardHeader
              title="Password"
              subtitle={
                user.mustChangePassword
                  ? 'You are still using a temporary password — please change it'
                  : 'Choose something you do not use anywhere else'
              }
              icon={KeyRound}
            />
            <form onSubmit={savePassword} className="space-y-4 p-5">
              <Input
                label="Current password"
                type={showPasswords ? 'text' : 'password'}
                autoComplete="current-password"
                value={passwords.currentPassword}
                error={passwordErrors.currentPassword}
                onChange={(e) =>
                  setPasswords((p) => ({ ...p, currentPassword: e.target.value }))
                }
                rightSlot={
                  <button
                    type="button"
                    onClick={() => setShowPasswords((value) => !value)}
                    aria-label={showPasswords ? 'Hide passwords' : 'Show passwords'}
                    className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100"
                  >
                    {showPasswords ? (
                      <EyeOff className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Eye className="h-4 w-4" aria-hidden="true" />
                    )}
                  </button>
                }
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="New password"
                  type={showPasswords ? 'text' : 'password'}
                  autoComplete="new-password"
                  hint="8+ characters, with upper, lower and a number"
                  value={passwords.newPassword}
                  error={passwordErrors.newPassword}
                  onChange={(e) => setPasswords((p) => ({ ...p, newPassword: e.target.value }))}
                />
                <Input
                  label="Confirm new password"
                  type={showPasswords ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={passwords.confirmPassword}
                  error={passwordErrors.confirmPassword}
                  onChange={(e) =>
                    setPasswords((p) => ({ ...p, confirmPassword: e.target.value }))
                  }
                />
              </div>

              <div className="flex justify-end">
                <Button type="submit" icon={KeyRound} loading={savingPassword}>
                  Change password
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </>
  );
};

export default Profile;
