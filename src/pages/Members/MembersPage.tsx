import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/common/Button";
import { EmptyState } from "@/components/common/EmptyState";
import { FilterTabs } from "@/components/common/FilterTabs";
import { MemberAvatar } from "@/components/members/MemberAvatar";
import { MemberProfileDrawer } from "@/components/members/MemberProfileDrawer";
import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge } from "@/components/common/StatusBadge";
import { MEMBER_FILTERS } from "@/constants/domain";
import { fetchMembers } from "@/services/membersApi";
import type { MemberFilter, MemberListItem } from "@/types/domain";
import { formatDate } from "@/utils/dates";
import { memberStatusLabel, memberStatusVariant } from "@/utils/memberStatus";
import { cn } from "@/utils/cn";

export function MembersPage() {
  const [filter, setFilter] = useState<MemberFilter>("all");
  const [members, setMembers] = useState<MemberListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setMembers(await fetchMembers(filter));
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return members;
    return members.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.phone.includes(q) ||
        m.member_code.toLowerCase().includes(q),
    );
  }, [members, search]);

  return (
    <div className="flex min-h-0 gap-4">
      <div className="min-w-0 flex-1">
        <PageHeader
          title="Members"
          subtitle="Search members, filter by subscription status, and register new clients."
          actions={
            <Link to="/members/new">
              <Button>
                <Plus className="size-4" />
                Add Member
              </Button>
            </Link>
          }
        />

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <FilterTabs items={MEMBER_FILTERS} value={filter} onChange={setFilter} />
          <div className="flex w-full max-w-sm items-center gap-2 rounded-shawish border border-shawish-border bg-shawish-surface px-3 py-2 sm:w-auto">
            <Search className="size-4 text-shawish-muted" />
            <input
              className="w-full bg-transparent text-sm focus:outline-none"
              placeholder="Search name, phone, ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-shawish-muted">Loading members...</p>
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No members found"
            description="Register a member with trainer, program, and subscription in one flow."
            action={
              <Link to="/members/new">
                <Button>
                  <Plus className="size-4" />
                  Add Member
                </Button>
              </Link>
            }
          />
        ) : (
          <div className="overflow-x-auto rounded-shawish-lg border border-shawish-border">
            <table className="min-w-full text-sm">
              <thead className="bg-shawish-surface-elevated text-left text-xs uppercase tracking-wide text-shawish-muted">
                <tr>
                  <th className="px-4 py-3">Member</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="hidden px-4 py-3 lg:table-cell">Trainer</th>
                  <th className="hidden px-4 py-3 md:table-cell">Subscription</th>
                  <th className="hidden px-4 py-3 xl:table-cell">End Date</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((member) => (
                  <tr
                    key={member.id}
                    className={cn(
                      "cursor-pointer border-t border-shawish-border transition-colors hover:bg-shawish-surface-elevated/40",
                      selectedId === member.id && "bg-shawish-orange-muted/40",
                    )}
                    onClick={() => setSelectedId(member.id)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <MemberAvatar name={member.name} photoPath={member.photo_path} size="sm" />
                        <div>
                          <p className="font-medium">{member.name}</p>
                          <p className="text-xs text-shawish-muted">{member.member_code}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">{member.phone}</td>
                    <td className="hidden px-4 py-3 lg:table-cell">{member.trainer_name || "—"}</td>
                    <td className="hidden px-4 py-3 md:table-cell">{member.subscription_label || "—"}</td>
                    <td className="hidden px-4 py-3 xl:table-cell">{formatDate(member.subscription_end_date)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge variant={memberStatusVariant(member.display_status)}>
                        {memberStatusLabel(member.display_status)}
                      </StatusBadge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {selectedId ? (
        <div className="sticky top-0 h-[calc(100vh-8.5rem)]">
          <MemberProfileDrawer
            memberId={selectedId}
            onClose={() => setSelectedId(null)}
            onChanged={() => void load()}
          />
        </div>
      ) : null}
    </div>
  );
}
